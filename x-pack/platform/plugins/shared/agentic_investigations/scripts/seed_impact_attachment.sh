#!/usr/bin/env bash
set -euo pipefail

# Seeds one investigation conversation with an Impact document and the
# by-reference investigation_impact attachment that attach stamps onto it.
#
# Impact entities come from the Entity Store, so the entity flyout opens for them. The script
# installs the store when needed, creates a user, host and service in it, then reads their
# generated ids back. If that fails, a well-formed placeholder id is used and the flyout will not
# find it.
#
# The attach goes through POST /internal/investigations/impact, which writes the
# document and creates the attachment. A second attach unions another entity
# onto the same document and must leave a single attachment on the conversation.
#
# Prerequisites:
#   - Kibana running at $KIBANA_URL (default: http://localhost:5601). A dev server started without
#     --no-base-path serves under a random prefix (curl -i $KIBANA_URL/ shows it in Location);
#     include it, e.g. KIBANA_URL=http://localhost:5601/abc
#   - agenticInvestigations and Agent Builder enabled
#   - the caller holds the investigations manage privilege (the elastic superuser does)
#   - for real entities: the caller may install the Entity Store (the elastic superuser may)
#
# Usage:
#   KIBANA_URL=http://localhost:5601 \
#   KIBANA_USER=elastic \
#   KIBANA_PASSWORD=changeme \
#   KIBANA_SPACE=default \
#   AGENT_ID=elastic-ai-agent \
#   bash x-pack/platform/plugins/shared/agentic_investigations/scripts/seed_impact_attachment.sh

KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
KIBANA_USER="${KIBANA_USER:-elastic}"
KIBANA_PASSWORD="${KIBANA_PASSWORD:-changeme}"
KIBANA_SPACE="${KIBANA_SPACE:-default}"
AGENT_ID="${AGENT_ID:-elastic-ai-agent}"
AGENT_BUILDER_API_VERSION="2023-10-31"
ENTITY_STORE_API_VERSION="2023-10-31"
ENTITY_STORE_URL="/api/security/entity_store"
ENTITY_STORE_INSTALL_TIMEOUT_SECONDS="${ENTITY_STORE_INSTALL_TIMEOUT_SECONDS:-120}"
IMPACT_API_VERSION="1"
IMPACT_ATTACHMENT_TYPE="investigation_impact"

if [ "$KIBANA_SPACE" = "default" ]; then
  KIBANA_API_BASE="${KIBANA_URL}"
else
  KIBANA_API_BASE="${KIBANA_URL}/s/${KIBANA_SPACE}"
fi

kibana_curl() {
  curl --silent --show-error --fail-with-body \
    -u "${KIBANA_USER}:${KIBANA_PASSWORD}" \
    -H "kbn-xsrf: true" \
    -H "x-elastic-internal-origin: kibana" \
    "$@"
}

# Succeeds when the user, host and service engines are all started.
entity_store_ready() {
  kibana_curl \
    -H "elastic-api-version: ${ENTITY_STORE_API_VERSION}" \
    "${KIBANA_API_BASE}${ENTITY_STORE_URL}/status" 2>/dev/null \
    | jq -e '[.engines[]? | select(.status == "started") | .type] as $started
        | all("user", "host", "service"; . as $t | $started | index($t) != null)' >/dev/null 2>&1
}

# Installs the Entity Store for the seed's entity types when they are not all started, then waits
# for the engines. Returns non-zero (after a warning) when that does not work out.
ensure_entity_store() {
  if entity_store_ready; then
    return 0
  fi

  echo "Installing the Entity Store (user, host, service)…" >&2
  if ! kibana_curl \
    -X POST \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: ${ENTITY_STORE_API_VERSION}" \
    "${KIBANA_API_BASE}${ENTITY_STORE_URL}/install" \
    -d '{"entityTypes":["user","host","service"],"logExtraction":{}}' >/dev/null 2>&1; then
    echo "Could not install the Entity Store." >&2
    return 1
  fi

  echo "Waiting for the Entity Store engines (up to ${ENTITY_STORE_INSTALL_TIMEOUT_SECONDS}s)…" >&2
  local waited=0
  while [ "$waited" -lt "$ENTITY_STORE_INSTALL_TIMEOUT_SECONDS" ]; do
    if entity_store_ready; then
      return 0
    fi
    sleep 3
    waited=$((waited + 3))
  done

  echo "The Entity Store engines did not start within ${ENTITY_STORE_INSTALL_TIMEOUT_SECONDS}s." >&2
  return 1
}

# Creates one entity of the given type. The Entity Store derives host and service ids from the
# name fields. A user's id also needs a namespace the API cannot set, so it is passed in as $3
# (the store's fallback namespace is "unknown"). An existing entity (409) is fine.
create_entity() {
  local entity_type="$1"
  local name="$2"
  local entity_id="${3:-}"
  local body
  body=$(jq -cn --arg t "$entity_type" --arg n "$name" --arg id "$entity_id" \
    '{entity: ({name: $n, type: $t, source: ["manual"]} + (if $id != "" then {id: $id} else {} end))}
      + {($t): {name: $n}}')

  local response status
  response=$(curl --silent --show-error \
    -u "${KIBANA_USER}:${KIBANA_PASSWORD}" \
    -H "kbn-xsrf: true" \
    -H "x-elastic-internal-origin: kibana" \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: ${ENTITY_STORE_API_VERSION}" \
    -w $'\n%{http_code}' \
    -X POST "${KIBANA_API_BASE}${ENTITY_STORE_URL}/entities/${entity_type}" \
    -d "$body") || response=$'\n000'
  status="${response##*$'\n'}"

  if [ "$status" != "200" ] && [ "$status" != "409" ]; then
    echo "Could not create ${entity_type} ${name} (HTTP ${status}): $(echo "${response%$'\n'*}" | jq -r '.message // .' 2>/dev/null)" >&2
  fi
}

# Prints one impact entity ({id, name, type}) for the Entity Store entity of the given type and
# name, or a placeholder when it cannot be found. Entities created through the API are only
# returned by the plain list mode (size + KQL filter), not by the paged entity_types mode.
real_entity() {
  local entity_type="$1"
  local name="$2"
  local found=""
  local attempt
  # A just-created entity can take a moment to become searchable.
  for attempt in 1 2 3 4 5; do
    found=$(kibana_curl \
      -H "elastic-api-version: ${ENTITY_STORE_API_VERSION}" \
      -G "${KIBANA_API_BASE}${ENTITY_STORE_URL}/entities" \
      --data-urlencode "size=1" \
      --data-urlencode "filter=entity.type:\"${entity_type}\" and entity.name:\"${name}\"" \
      2>/dev/null \
      | jq -c '.entities[0].entity // empty | {id, name, type} | with_entries(select(.value != null))' \
      2>/dev/null) || found=""
    if [ -n "$found" ]; then
      echo "$found"
      return
    fi
    sleep 2
  done

  echo "No ${entity_type} ${name} in the Entity Store; using placeholder ${entity_type}:${name}." >&2
  jq -cn --arg t "$entity_type" --arg n "$name" '{id: ($t + ":" + $n), name: $n, type: $t}'
}

attach_impact() {
  local conversation_id="$1"
  local entities_json="$2"
  kibana_curl \
    -X POST \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: ${IMPACT_API_VERSION}" \
    "${KIBANA_API_BASE}/internal/investigations/impact" \
    -d "$(jq -n --arg cid "$conversation_id" --argjson entities "$entities_json" \
      '{ conversationId: $cid, entities: $entities }')"
}

list_impact_attachments() {
  local conversation_id="$1"
  kibana_curl \
    -H "elastic-api-version: ${AGENT_BUILDER_API_VERSION}" \
    "${KIBANA_API_BASE}/api/agent_builder/conversations/${conversation_id}/attachments" \
    | jq --arg type "$IMPACT_ATTACHMENT_TYPE" '[.results[] | select(.type == $type)]'
}

echo "Creating an investigation conversation…"
CONVERSATION_ID=$(kibana_curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "elastic-api-version: ${AGENT_BUILDER_API_VERSION}" \
  "${KIBANA_API_BASE}/api/agent_builder/conversations" \
  -d "$(jq -n --arg a "$AGENT_ID" '{
    title: "AlertZero — Impact attachment seed",
    agent_id: $a,
    template_id: "investigation",
    access_control: { access_mode: "public" }
  }')" | jq -r '.id')

echo "Preparing entities in the Entity Store…"
if ensure_entity_store; then
  create_entity user cfo user:cfo@unknown
  create_entity host fin-dc-01
  create_entity service payments
fi

echo "Looking up entities in the Entity Store…"
USER_ENTITY=$(real_entity user cfo)
HOST_ENTITY=$(real_entity host fin-dc-01)
SERVICE_ENTITY=$(real_entity service payments)

echo "Attaching the first entities…"
FIRST=$(attach_impact "$CONVERSATION_ID" "$(jq -cn --argjson u "$USER_ENTITY" --argjson h "$HOST_ENTITY" '[$u, $h]')")
IMPACT_ID=$(echo "$FIRST" | jq -r '.id')

ATTACHMENTS=$(list_impact_attachments "$CONVERSATION_ID")
ATTACHMENT_COUNT=$(echo "$ATTACHMENTS" | jq 'length')
ATTACHMENT_ORIGIN=$(echo "$ATTACHMENTS" | jq -r '.[0].origin // empty')

if [ "$ATTACHMENT_COUNT" != "1" ] || [ "$ATTACHMENT_ORIGIN" != "$IMPACT_ID" ]; then
  echo "Expected one investigation_impact attachment with origin ${IMPACT_ID}." >&2
  echo "$ATTACHMENTS" >&2
  exit 1
fi

echo "Attaching another entity onto the same conversation…"
SECOND=$(attach_impact "$CONVERSATION_ID" "$(jq -cn --argjson s "$SERVICE_ENTITY" '[$s]')")
SECOND_ID=$(echo "$SECOND" | jq -r '.id')
ENTITY_IDS=$(echo "$SECOND" | jq -c '[.entities[].id]')

ATTACHMENTS=$(list_impact_attachments "$CONVERSATION_ID")
ATTACHMENT_COUNT=$(echo "$ATTACHMENTS" | jq 'length')

if [ "$SECOND_ID" != "$IMPACT_ID" ] || [ "$ATTACHMENT_COUNT" != "1" ]; then
  echo "A second attach must update the same impact document and attachment." >&2
  echo "impact ids: ${IMPACT_ID} then ${SECOND_ID}; attachments: ${ATTACHMENT_COUNT}" >&2
  exit 1
fi

echo "  conversation: ${CONVERSATION_ID}"
echo "  impact:      ${IMPACT_ID}"
echo "  entities:    ${ENTITY_IDS}"
echo "  attachment:  ${IMPACT_ATTACHMENT_TYPE} origin=${IMPACT_ID}"
