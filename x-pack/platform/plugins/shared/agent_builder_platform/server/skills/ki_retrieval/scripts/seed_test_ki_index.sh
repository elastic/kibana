#!/usr/bin/env bash
# Seed a test KI index for ki-retrieval skill validation.
#
# Creates ai-index-idx-ki-retrieval-test with realistic fake KIs across
# all three common type values (index_metadata, document, entity_profile)
# so the agent has something meaningful to retrieve.
#
# Usage:
#   ./seed_test_ki_index.sh [--delete]  # --delete removes the index first

set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
source "$REPO_ROOT/scripts/kibana_api_common.sh"

INDEX="ai-index-idx-ki-retrieval-test"
DELETE_FIRST=false
[[ "${1:-}" == "--delete" ]] && DELETE_FIRST=true

if $DELETE_FIRST; then
  echo "Deleting existing index $INDEX..."
  kibana_curl -s -X DELETE "$KIBANA_URL/es/internal/$INDEX" || true
fi

echo "Creating index: $INDEX"
kibana_curl -s -X PUT "$KIBANA_URL/es/internal/$INDEX" \
  -H "Content-Type: application/json" \
  -d '{
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "type":        { "type": "keyword" },
      "title":       { "type": "text", "fields": { "semantic": { "type": "semantic_text" } } },
      "content":     { "type": "text", "fields": { "semantic": { "type": "semantic_text" } } },
      "description": { "type": "text", "fields": { "semantic": { "type": "semantic_text" } } },
      "tags":        { "type": "keyword" },
      "attributes":  { "type": "flattened" },
      "discovery_labels": {
        "type": "nested",
        "properties": {
          "value": { "type": "search_as_you_type" },
          "kind":  { "type": "keyword" }
        }
      },
      "ingestion_method": { "type": "keyword" }
    }
  }
}' | jq .

echo ""
echo "Seeding KI documents..."

# --------------------------------------------------------------------------
# KI 1: index_metadata – customer support tickets
# --------------------------------------------------------------------------
kibana_curl -s -X POST "$KIBANA_URL/es/internal/$INDEX/_doc/raw-cases-all" \
  -H "Content-Type: application/json" \
  -d '{
  "type": "index_metadata",
  "title": "Customer Support Tickets",
  "description": "Support case records with status, priority, and resolution notes. Does NOT contain product telemetry, billing data, or engineering bug reports.",
  "tags": ["support", "cases"],
  "attributes": {
    "key_fields": ["case_number", "status", "priority", "resolution"],
    "when_to_use": "Use when answering questions about support case status, resolution history, or ticket counts by priority.",
    "joins": ["case_number -> raw-articles-all"]
  },
  "ingestion_method": "manual",
  "content": "Backing index: raw-cases-all. Stores individual support case records opened by customers. Each case has a unique case_number, a status (open, in-progress, resolved), a priority (P1–P4), and a resolution field populated when the case closes.\n\nQuestions answered: What is the status of case 02115676? | How many open P1 cases exist? | What was the resolution for cases closed last week?\nWhen to use: Use for support case lookups by case number, status, or date range.\nKey fields: case_number (keyword), status (keyword), priority (keyword), resolution (text), created_at (date)\nJoins: case_number -> raw-articles-all (related knowledge base articles)\n\nAccess patterns:\n  Q: Status of a specific case\n  ESQL: FROM raw-cases-all | WHERE case_number == ?case_number | KEEP status, priority, resolution | LIMIT 1\n  params: case_number (keyword, e.g. \"02115676\")\n  returns: status, priority, resolution\n\n  Q: Open cases by priority\n  ESQL: FROM raw-cases-all | WHERE status == \"open\" | STATS count = COUNT(*) BY priority | SORT count DESC\n  params: none\n  returns: priority, count"
}' | jq -r '"KI 1 inserted: " + .result'

# --------------------------------------------------------------------------
# KI 2: index_metadata – product catalog
# --------------------------------------------------------------------------
kibana_curl -s -X POST "$KIBANA_URL/es/internal/$INDEX/_doc/raw-products-all" \
  -H "Content-Type: application/json" \
  -d '{
  "type": "index_metadata",
  "title": "Product Catalog",
  "description": "Current product listings with pricing, availability, and category hierarchy. Does NOT contain historical pricing, customer reviews, or inventory movements.",
  "tags": ["products", "catalog", "pricing"],
  "attributes": {
    "key_fields": ["product_id", "name", "category", "price", "in_stock"],
    "when_to_use": "Use when answering questions about product availability, pricing, or category structure.",
    "joins": []
  },
  "ingestion_method": "manual",
  "content": "Backing index: raw-products-all. Stores the current product catalog. Each record has a product_id, name, category path, price (float), and in_stock boolean.\n\nQuestions answered: Is product SKU-4821 in stock? | What products are available under category Electronics? | What is the price of a specific item?\nWhen to use: Product availability and pricing lookups.\nKey fields: product_id (keyword), name (text), category (keyword), price (float), in_stock (boolean)\n\nAccess patterns:\n  Q: Availability of a specific product\n  ESQL: FROM raw-products-all | WHERE product_id == ?product_id | KEEP name, price, in_stock | LIMIT 1\n  params: product_id (keyword, e.g. \"SKU-4821\")\n  returns: name, price, in_stock\n\n  Q: Products in a category\n  ESQL: FROM raw-products-all | WHERE category == ?category AND in_stock == true | KEEP product_id, name, price | SORT price ASC | LIMIT 20\n  params: category (keyword, e.g. \"Electronics\")\n  returns: product_id, name, price"
}' | jq -r '"KI 2 inserted: " + .result'

# --------------------------------------------------------------------------
# KI 3: document – a resolved support case (bottom-up KI)
# --------------------------------------------------------------------------
kibana_curl -s -X POST "$KIBANA_URL/es/internal/$INDEX/_doc/raw-cases-all/02115676" \
  -H "Content-Type: application/json" \
  -d '{
  "type": "document",
  "title": "Case 02115676: Agent Builder dashboard fails to load after upgrade",
  "description": "Resolved P2 case. Root cause: stale session token after 9.3 upgrade. Workaround: clear browser cache. Fixed in 9.3.2 patch.",
  "tags": ["support", "agent-builder", "resolved"],
  "attributes": {
    "case_number": "02115676",
    "status": "resolved",
    "priority": "P2",
    "product": "agent-builder",
    "resolution": "stale-session-token"
  },
  "ingestion_method": "manual",
  "content": "Case 02115676. Status: resolved. Priority: P2.\nSummary: After upgrading to Kibana 9.3, the Agent Builder dashboard returned a blank screen on first load.\nRoot cause: The session token stored in localStorage used an old format not recognized by the 9.3 auth middleware, causing a silent 401 on the initial data fetch.\nResolution: Clear browser local storage or force-logout. Permanent fix shipped in 9.3.2.\nAffected product: agent-builder. Affected versions: 9.3.0, 9.3.1.\nKey entities: Agent Builder, Kibana 9.3, session token, localStorage."
}' | jq -r '"KI 3 inserted: " + .result'

# --------------------------------------------------------------------------
# KI 4: entity_profile – customer entity (cumulative KI)
# --------------------------------------------------------------------------
kibana_curl -s -X POST "$KIBANA_URL/es/internal/$INDEX/_doc/entity-acme-corp" \
  -H "Content-Type: application/json" \
  -d '{
  "type": "entity_profile",
  "title": "ACME Corp – Customer Profile",
  "description": "Synthesized profile for ACME Corp. Covers support history, product usage, and open cases. Updated from last 90 days of records.",
  "tags": ["entity", "customer", "enterprise"],
  "attributes": {
    "entity_name": "ACME Corp",
    "entity_type": "customer",
    "tier": "enterprise",
    "open_cases": 3,
    "top_products": ["agent-builder", "fleet"],
    "related_indices": ["raw-cases-all", "raw-products-all"]
  },
  "ingestion_method": "manual",
  "content": "Entity: ACME Corp. Type: customer. Tier: enterprise.\nSummary: ACME Corp is an enterprise customer primarily using Agent Builder and Fleet. Over the last 90 days they opened 7 support cases, 3 of which remain open. Their cases cluster around agent configuration (4 cases) and connector setup (3 cases).\nKey facts: Main contact is ops-team@acme.example. Account manager: Alice R. SLA: P2 response in 4h.\nOpen cases: 02117890 (agent config, P2), 02118001 (connector, P3), 02118210 (connector, P3).\nQuestions answered: How many open cases does ACME Corp have? | What products does ACME Corp use? | What is ACME Corp'\''s support history?\nAccess patterns:\n  Q: All open cases for ACME Corp\n  ESQL: FROM raw-cases-all | WHERE account == \"ACME Corp\" AND status == \"open\" | KEEP case_number, priority, created_at | SORT created_at DESC\n  params: none (entity-specific query)\n  returns: case_number, priority, created_at"
}' | jq -r '"KI 4 inserted: " + .result'

# --------------------------------------------------------------------------
# KI 5: index_metadata – application logs (selective/outlier use case)
# --------------------------------------------------------------------------
kibana_curl -s -X POST "$KIBANA_URL/es/internal/$INDEX/_doc/logs-app-prod" \
  -H "Content-Type: application/json" \
  -d '{
  "type": "index_metadata",
  "title": "Application Production Logs",
  "description": "High-volume application log stream from production services. Does NOT contain infrastructure metrics, audit logs, or security events. Only ERROR and WARN level entries are indexed as KIs.",
  "tags": ["logs", "production", "errors"],
  "attributes": {
    "key_fields": ["@timestamp", "log.level", "service.name", "message", "error.type"],
    "when_to_use": "Use when diagnosing application errors or finding recent failures by service.",
    "joins": []
  },
  "ingestion_method": "manual",
  "content": "Backing index: logs-app-prod-*. Stores application log events from production services. Volume: ~2M events/day. Only ERROR and WARN level entries are indexed here.\n\nQuestions answered: What errors occurred in the payment service in the last hour? | How many ERROR-level log entries appeared today? | What services had the most failures last week?\nWhen to use: Application error diagnosis and service failure detection. Do not use for INFO-level logs or infrastructure metrics.\nKey fields: @timestamp (date), log.level (keyword), service.name (keyword), message (text), error.type (keyword), error.stack_trace (text)\n\nAccess patterns:\n  Q: Recent errors for a specific service\n  ESQL: FROM logs-app-prod-* | WHERE service.name == ?service AND log.level == \"ERROR\" AND @timestamp >= NOW() - 1 hour | KEEP @timestamp, message, error.type | SORT @timestamp DESC | LIMIT 20\n  params: service (keyword, e.g. \"payment-service\")\n  returns: @timestamp, message, error.type\n\n  Q: Error count by service today\n  ESQL: FROM logs-app-prod-* | WHERE log.level == \"ERROR\" AND @timestamp >= NOW() - 1 day | STATS error_count = COUNT(*) BY service.name | SORT error_count DESC | LIMIT 10\n  params: none\n  returns: service.name, error_count"
}' | jq -r '"KI 5 inserted: " + .result'

echo ""
echo "Refreshing index..."
kibana_curl -s -X POST "$KIBANA_URL/es/internal/$INDEX/_refresh" | jq -r '"Refresh: " + .result'

echo ""
echo "Verifying doc count:"
kibana_curl -s "$KIBANA_URL/es/internal/$INDEX/_count" | jq '"Count: \(.count) docs in $INDEX"'

echo ""
echo "Done. Index '$INDEX' is ready."
echo ""
echo "Validate ES|QL syntax (run these manually via Kibana Dev Tools or execute_esql):"
echo ""
echo '  Keyword:  FROM ai-index-idx-ki-retrieval-test METADATA _score | WHERE content:"support case" OR title:"support case" | SORT _score DESC | LIMIT 5'
echo '  Semantic: FROM ai-index-idx-ki-retrieval-test METADATA _score | WHERE content.semantic:"customer support tickets" | SORT _score DESC | LIMIT 5'
echo '  Scoped:   FROM ai-index-idx-ki-retrieval-test METADATA _score | WHERE type == "index_metadata" AND content:"logs" | SORT _score DESC | LIMIT 5'
echo '  FORK+FUSE:'
echo '    FROM ai-index-idx-ki-retrieval-test METADATA _score'
echo '    | FORK'
echo '        ( WHERE content:"product catalog" | SORT _score DESC | LIMIT 10 )'
echo '        ( WHERE content.semantic:"product catalog" | SORT _score DESC | LIMIT 10 )'
echo '    | FUSE'
echo '    | SORT _score DESC | LIMIT 5'
echo '  Aggregation: FROM ai-index-idx-ki-retrieval-test | STATS ki_count = COUNT(*) BY type | SORT ki_count DESC'
