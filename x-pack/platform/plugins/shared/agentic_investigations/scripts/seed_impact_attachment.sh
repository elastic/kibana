#!/usr/bin/env bash
set -euo pipefail

# Seeds one investigation conversation with an Impact document and the
# by-reference investigation_impact attachment that attach stamps onto it.
#
# The attach goes through POST /internal/investigations/impact, which writes the
# document and creates the attachment. A second attach unions another entity
# onto the same document and must leave a single attachment on the conversation.
#
# Prerequisites:
#   - Kibana running at $KIBANA_URL (default: http://localhost:5601)
#   - agenticInvestigations and Agent Builder enabled
#   - the caller holds the investigations manage privilege (the elastic superuser does)
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
    "$@"
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

echo "Attaching the first entities…"
FIRST=$(attach_impact "$CONVERSATION_ID" '[{"id":"user-1"},{"id":"host-1","name":"fin-dc-01"}]')
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
SECOND=$(attach_impact "$CONVERSATION_ID" '[{"id":"service-1","name":"payments"}]')
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
