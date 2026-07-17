/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG } from '@kbn/significant-events-schema';
import type { Detection, Discovery } from '@kbn/significant-events-schema';
import { GCS_BUCKET, OTEL_DEMO_GCS_BASE_PATH_PREFIX, OTEL_DEMO_NAMESPACE } from '../constants';
import type { DatasetConfig } from './types';

/**
 * Flatten the detections declared on each expected discovery into the input detection list the
 * discovery agent receives. Mirrors the bank_of_anthos pattern: the canonical input and the
 * expected answer stay self-consistent because both derive from the same discovery objects.
 */
const toInputDetections = (discoveries: Array<Partial<Discovery>>): Array<Partial<Detection>> =>
  discoveries
    .flatMap((discovery) => discovery.detections ?? [])
    .map((detection) => ({
      ...detection,
      change_point_type: 'spike' as const,
      p_value: 0.0001,
    }));

/**
 * Canonical payment-unreachable cascade — the SigEvents discovery agent should collapse the charge
 * failures, the gRPC transport/dialing errors, and the checkout PlaceOrder failures into ONE
 * discovery rooted at the unreachable payment service.
 *
 * Criteria and root cause are phrased at the incident level (service/dependency/error-signature),
 * NOT against ingest-specific values (IPs, doc counts, transaction IDs), because the log set this
 * runs against is the local otel-demo capture, not a pinned shared snapshot. The stable error
 * signatures used here ("failed to charge card", "dial tcp", "i/o timeout") are otel-demo
 * application constants, so they survive re-ingest.
 */
const PAYMENT_UNREACHABLE_CASCADE_DISCOVERY: Partial<Discovery> = {
  kind: 'discovery',
  discovery_slug: 'checkout__payment-unreachable-charge-failures',
  title:
    'checkout — payment service unreachable: charge failures cascading to frontend gRPC errors',
  summary:
    'The payment service is unreachable, so checkout cannot charge cards during PlaceOrder and the frontend surfaces gRPC code 13 INTERNAL / code 14 UNAVAILABLE errors ("failed to charge card"). Users cannot complete orders. Onset correlates with the payment disruption; healthy traffic across cart, recommendation, and ad continues unaffected.',
  root_cause:
    'The payment service is unreachable over the network (transport dialing failures — "dial tcp … i/o timeout" / "connection refused"). checkout calls payment during PlaceOrder to charge the card; because payment cannot be reached, the charge fails and the failure surfaces to the frontend as gRPC code 13 INTERNAL / code 14 UNAVAILABLE ("failed to charge card"). The blast radius is the checkout path; services that do not depend on payment continue to operate normally.',
  criticality: 88,
  confidence: 80,
  detections: [
    {
      detection_id: 'otel-pay-charge-fail-det',
      rule_name: 'Frontend Payment Charge Failures',
      rule_uuid: 'a1e0b2c3-1111-4a5b-8c9d-0e1f2a3b4c50',
      stream_name: 'logs',
      change_point_type: 'spike',
      p_value: 0.0001,
    },
    {
      detection_id: 'otel-pay-grpc-transport-det',
      rule_name: 'gRPC Transport Dialing Errors Reaching Payment',
      rule_uuid: 'a1e0b2c3-2222-4a5b-8c9d-0e1f2a3b4c51',
      stream_name: 'logs',
      change_point_type: 'spike',
      p_value: 0.0001,
    },
    {
      detection_id: 'otel-checkout-placeorder-det',
      rule_name: 'Checkout PlaceOrder Failures',
      rule_uuid: 'a1e0b2c3-3333-4a5b-8c9d-0e1f2a3b4c52',
      stream_name: 'logs',
      change_point_type: 'spike',
      p_value: 0.0001,
    },
  ],
  cause_kis: [
    { name: 'payment', stream_name: 'logs' },
    { name: 'checkout', stream_name: 'logs' },
    { name: 'frontend', stream_name: 'logs' },
  ],
  dependency_edges: [
    { source: 'frontend', target: 'checkout', exposure: 'exposed' },
    { source: 'checkout', target: 'payment', exposure: 'exposed' },
  ],
  // Lean evidence trail using stable otel-demo application signatures (no ingest-specific IPs). The
  // judge, if run, re-verifies each query via execute_esql before promoting.
  evidences: [
    {
      rule_name: 'Frontend Payment Charge Failures',
      rule_uuid: 'a1e0b2c3-1111-4a5b-8c9d-0e1f2a3b4c50',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        'Testing: whether the frontend is failing to charge cards because payment is unreachable. Expected if true: "failed to charge card" errors in frontend logs. Verdict: confirms — checkout→payment charge calls are failing and the failure is user-visible at the frontend.',
      esql_query:
        'FROM logs | WHERE resource.attributes.app == "frontend" AND MATCH_PHRASE(body.text, "failed to charge card") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
    {
      rule_name: 'gRPC Transport Dialing Errors Reaching Payment',
      rule_uuid: 'a1e0b2c3-2222-4a5b-8c9d-0e1f2a3b4c51',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        'Testing: whether the charge failures are caused by the payment service being unreachable at the transport layer. Expected if true: "transport: Error while dialing" / "dial tcp" / "i/o timeout" in frontend logs. Verdict: confirms — the root cause is network unreachability of payment, not an application error in checkout.',
      esql_query:
        'FROM logs | WHERE MATCH_PHRASE(body.text, "dial tcp") OR MATCH_PHRASE(body.text, "i/o timeout") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
    {
      rule_name: 'Checkout PlaceOrder Failures',
      rule_uuid: 'a1e0b2c3-3333-4a5b-8c9d-0e1f2a3b4c52',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        'Testing: whether the impact reaches the checkout order path. Expected if true: PlaceOrder activity in checkout logs coinciding with the charge failures. Verdict: confirms — order completion is blocked because the charge step fails.',
      esql_query:
        'FROM logs | WHERE resource.attributes.app == "checkout" AND MATCH_PHRASE(body.text, "PlaceOrder") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
  ],
};

/**
 * Cart-service Redis/Valkey cutoff — cartservice loses connectivity to its backing store,
 * crashes, and the frontend starts surfacing gRPC code 14 UNAVAILABLE on cart operations.
 */
const CART_REDIS_CUTOFF_DISCOVERY: Partial<Discovery> = {
  kind: 'discovery',
  event_id: 'cartservice__cart-valkey-connection-refused',
  title: 'Cart Service — Valkey store connection refused',
  symptom_hypothesis:
    'Cart operations are failing because cartservice cannot reach its Valkey/Redis backing store.',
  summary:
    'cartservice is failing to connect to its Valkey/Redis backing store (connection refused), so cart operations error and the service crashes; the frontend then sees gRPC UNAVAILABLE when fetching carts during checkout. Users cannot retrieve or update their carts. Restore Valkey connectivity / roll back the cart cache change.',
  severity: '80-critical',
  confidence: 0.8,
  stream_names: ['logs'],
  signals: [
    {
      type: 'detection',
      stream_name: 'logs',
      confirmed: true,
      description:
        'Testing: whether cartservice lost connectivity to its Valkey/Redis backing store. Expected if true: "Wasn\'t able to connect to redis" and ValkeyCartStore failures in cart logs. Found: connection-refused errors from cartservice.cartstore.ValkeyCartStore. Verdict: confirms — the cache backend is unreachable, breaking cart operations.',
      evidence: {
        esql_query:
          'FROM logs | WHERE MATCH_PHRASE(body.text, "Wasn\'t able to connect to redis") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: 'otel-cart-valkey-conn-det',
        rule_name: 'Cart Valkey Connection Failures',
        rule_uuid: 'c3d4e5f6-5555-4a5b-8c9d-0e1f2a3b4c70',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
  ],
  causal_features: [{ feature_id: 'cartservice', name: 'cartservice', stream_name: 'logs' }],
  blast_radius: [
    {
      type: 'dependency',
      feature_id: 'cartservice-valkey',
      source: 'cartservice',
      target: 'valkey',
      stream_name: 'logs',
    },
    {
      type: 'dependency',
      feature_id: 'frontend-cartservice',
      source: 'frontend',
      target: 'cartservice',
      stream_name: 'logs',
    },
  ],
};

/** Benign recommendation activity spike — must stay a SEPARATE discovery from the failure cascade. */
const BENIGN_RECOMMENDATION_DISCOVERY: Partial<Discovery> = {
  kind: 'discovery',
  discovery_slug: 'recommendation__list-recommendations-activity',
  title: 'recommendation — ListRecommendations: successful request-volume spike',
  summary:
    'The recommendation service is logging a spike in successful ListRecommendations requests. No failure symptoms are present — all observed events are normal request handling, consistent with load-generator traffic. This is an independent signal from the payment-unreachable cascade and is not an incident.',
  root_cause:
    'Normal load-driven increase in recommendation request volume; all operations succeeded — no failure condition.',
  criticality: 10,
  confidence: 65,
  detections: [
    {
      detection_id: 'otel-recommendation-volume-det',
      rule_name: 'Recommendation ListRecommendations Volume',
      rule_uuid: 'b2f1c3d4-4444-4a5b-8c9d-0e1f2a3b4c60',
      stream_name: 'logs',
      change_point_type: 'spike',
      p_value: 0.0001,
    },
  ],
  cause_kis: [{ name: 'recommendation', stream_name: 'logs' }],
  evidences: [
    {
      rule_name: 'Recommendation ListRecommendations Volume',
      rule_uuid: 'b2f1c3d4-4444-4a5b-8c9d-0e1f2a3b4c60',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        'Testing: whether the recommendation volume spike represents a failure or anomalous activity. Expected if true: error/exception patterns in recommendation logs. Verdict: refutes — the spike is successful ListRecommendations request handling, consistent with load-generator activity.',
      esql_query:
        'FROM logs | WHERE resource.attributes.app == "recommendation" AND MATCH_PHRASE(body.text, "Receive ListRecommendations for product ids") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
  ],
};

export const otelDemoDataset: DatasetConfig = {
  id: OTEL_DEMO_NAMESPACE,
  description: 'OpenTelemetry Demo microservices application',
  gcs: { bucket: GCS_BUCKET, basePathPrefix: OTEL_DEMO_GCS_BASE_PATH_PREFIX },
  kiFeatureExtraction: [
    {
      input: {
        scenario_id: 'healthy-baseline',
      },
      output: {
        criteria: [
          {
            id: 'entity-cart',
            text: 'Must identify cart service as an entity with filter on resource.attributes.app=cart (evidence: 697 docs; ValkeyCartStore operations — GetCartAsync, AddItemAsync, EmptyCartAsync — in body.text)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app': 'cart' } }],
          },
          {
            id: 'entity-checkout',
            text: 'Must identify checkout service as an entity with filter on resource.attributes.app=checkout (evidence: 223 docs; "payment went through (transaction_id: ...)" and "order confirmation email sent to" in body.text)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app': 'checkout' } }],
          },
          {
            id: 'entity-shipping',
            text: 'Must identify shipping service as an entity (evidence: 223 docs; "Sending Quote" and "Received quote" patterns in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'shipping' } }],
          },
          {
            id: 'entity-email',
            text: 'Must identify email service as an entity (evidence: 157 docs; POST /send_order_confirmation HTTP/1.1 200 in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'email' } }],
          },
          {
            id: 'entity-payment',
            text: 'Must identify payment service as an entity (evidence: 154 docs; attributes.msg contains "Charge request received" and "Transaction complete")',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'payment' } }],
          },
          {
            id: 'entity-recommendation',
            text: 'Must identify recommendation service as an entity (evidence: 135 docs; "Receive ListRecommendations for product ids" from recommendation_server.py in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'recommendation' } }],
          },
          {
            id: 'entity-ad',
            text: 'Must identify ad service as an entity (evidence: 131 docs; "oteldemo.AdService - Targeted ad request received" in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'ad' } }],
          },
          {
            id: 'entity-quote',
            text: 'Must identify quote service as an entity (evidence: 74 docs; POST /getquote HTTP/1.1 200 in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'quote' } }],
          },
          {
            id: 'entity-frontend',
            text: 'Must identify frontend service as an entity (evidence: resource.attributes.app=frontend; only 3 docs with startup messages)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'frontend' } }],
          },
          {
            id: 'entity-valkey',
            text: 'Must identify valkey as a cache/data store entity (evidence: 10 docs with background saving/RDB operations; cart service logs reference ValkeyCartStore; container image valkey/valkey:8-alpine)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'valkey' } }],
          },
          {
            id: 'dep-checkout-payment',
            text: 'Must identify the dependency checkout → payment (evidence: 74 checkout docs log "payment went through (transaction_id: ...)" correlating with payment "Charge request received" / "Transaction complete")',
            score: 2,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'checkout' } },
                    { match_phrase: { 'body.text': 'payment went through' } },
                  ],
                },
              },
              { term: { 'resource.attributes.app': 'payment' } },
            ],
          },
          {
            id: 'dep-cart-valkey',
            text: 'Must identify the dependency cart → valkey (evidence: cart logs reference cartservice.cartstore.ValkeyCartStore for GetCartAsync/AddItemAsync; valkey runs its own container with valkey/valkey:8-alpine image)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'cart' } },
              { term: { 'resource.attributes.app': 'valkey' } },
            ],
          },
          {
            id: 'dep-checkout-email',
            text: 'Should identify the dependency checkout → email (evidence: checkout logs "order confirmation email sent to" at same timestamps as email POST /send_order_confirmation 200)',
            score: 1,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'checkout' } },
                    { match_phrase: { 'body.text': 'order confirmation email sent to' } },
                  ],
                },
              },
              { term: { 'resource.attributes.app': 'email' } },
            ],
          },
          {
            id: 'tech-kubernetes',
            text: 'Must identify Kubernetes as infrastructure (evidence: resource.attributes.k8s.node.name=minikube, resource.attributes.k8s.namespace.name=otel-demo, deployment/pod/container metadata on all docs)',
            score: 1,
          },
        ],
        min_features: 8,
        max_features: 25,
        required_types: ['entity'],
        expect_entity_filters: true,
        expected_ground_truth:
          'entities=[cart, checkout, shipping, email, payment, recommendation, ad, quote, frontend, valkey], deps=[checkout->payment, cart->valkey, checkout->email, shipping->quote], infra=[kubernetes/minikube, otel-demo namespace, otel-collector for log aggregation, arm64 architecture]',
      },
      metadata: {
        difficulty: 'easy',
        failure_domain: 'none',
      },
    },
    {
      input: {
        scenario_id: 'payment-unreachable',
      },
      output: {
        criteria: [
          {
            id: 'entity-cart',
            text: 'Must identify cart service as an entity with filter on resource.attributes.app=cart (evidence: 1281 docs; ValkeyCartStore operations — GetCartAsync, AddItemAsync — in body.text)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app': 'cart' } }],
          },
          {
            id: 'entity-checkout',
            text: 'Must identify checkout service as an entity with filter on resource.attributes.app=checkout (evidence: 280 docs; "[PlaceOrder] user_id=..." and "order confirmation email sent to" in body.text)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app': 'checkout' } }],
          },
          {
            id: 'entity-frontend',
            text: 'Must identify frontend service as an entity (evidence: 315 docs; gRPC errors including "Error: 13 INTERNAL: failed to charge card" and "Error: 14 UNAVAILABLE: No connection established" with Node.js stack traces)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'frontend' } },
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'frontend' } },
                    { match_phrase: { 'body.text': 'failed to charge card' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'entity-shipping',
            text: 'Must identify shipping service as an entity (evidence: 372 docs; "Sending Quote", "Received quote", "Tracking ID Created" patterns in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'shipping' } }],
          },
          {
            id: 'entity-payment',
            text: 'Must identify payment service as an entity (evidence: 127 docs; attributes.msg="Charge request received" / "Transaction complete"; partially reachable during this scenario)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'payment' } }],
          },
          {
            id: 'entity-email',
            text: 'Must identify email service as an entity (evidence: 130 docs; POST /send_order_confirmation HTTP/1.1 200 in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'email' } }],
          },
          {
            id: 'entity-recommendation',
            text: 'Must identify recommendation service as an entity (evidence: 223 docs; "Receive ListRecommendations for product ids" from recommendation_server.py)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'recommendation' } }],
          },
          {
            id: 'entity-ad',
            text: 'Must identify ad service as an entity (evidence: 250 docs; "oteldemo.AdService - Targeted ad request received" in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'ad' } }],
          },
          {
            id: 'entity-quote',
            text: 'Must identify quote service as an entity (evidence: 156 docs; POST /getquote HTTP/1.1 200 in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'quote' } }],
          },
          {
            id: 'entity-valkey',
            text: 'Must identify valkey as a cache/data store entity (evidence: 15 docs; cart logs reference ValkeyCartStore; container image valkey/valkey:8-alpine)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'valkey' } }],
          },
          {
            id: 'dep-checkout-payment',
            text: 'Must identify the dependency checkout → payment (evidence: checkout PlaceOrder triggers payment; frontend shows "failed to charge card: could not charge the card: rpc error: code = Unavailable ... dial tcp 10.98.122.240:9999: i/o timeout")',
            score: 3,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'checkout' } },
              { term: { 'resource.attributes.app': 'payment' } },
            ],
          },
          {
            id: 'dep-cart-valkey',
            text: 'Must identify the dependency cart → valkey (evidence: cart logs reference cartservice.cartstore.ValkeyCartStore for GetCartAsync/AddItemAsync)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'cart' } },
              { term: { 'resource.attributes.app': 'valkey' } },
            ],
          },
          {
            id: 'dep-checkout-email',
            text: 'Should identify the dependency checkout → email (evidence: checkout logs "order confirmation email sent to" correlating with email POST /send_order_confirmation 200)',
            score: 1,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'checkout' } },
                    { match_phrase: { 'body.text': 'order confirmation email sent to' } },
                  ],
                },
              },
              { term: { 'resource.attributes.app': 'email' } },
            ],
          },
          {
            id: 'error-payment-unreachable',
            text: 'Must reference payment unreachability errors in at least one feature: gRPC code 13 INTERNAL / code 14 UNAVAILABLE, "failed to charge card", "transport: Error while dialing: dial tcp", "i/o timeout", or "connection refused"',
            score: 3,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'frontend' } },
                    { match_phrase: { 'body.text': 'failed to charge card' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'tech-kubernetes',
            text: 'Must identify Kubernetes as infrastructure (evidence: resource.attributes.k8s.node.name=minikube, resource.attributes.k8s.namespace.name=otel-demo)',
            score: 1,
          },
        ],
        min_features: 8,
        max_features: 25,
        required_types: ['entity', 'dependency'],
        expect_entity_filters: true,
        expected_ground_truth:
          'entities=[cart, checkout, frontend, shipping, payment, email, recommendation, ad, quote, valkey], deps=[checkout->payment, cart->valkey, checkout->email, shipping->quote, frontend->checkout], infra=[kubernetes/minikube], error_signatures=[failed to charge card, dial tcp i/o timeout, gRPC code 13 INTERNAL / code 14 UNAVAILABLE, transport: Error while dialing, connection refused; errors observed in frontend service logs]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'checkout',
        failure_mode: 'payment_unreachable',
      },
    },
    {
      input: {
        scenario_id: 'cart-redis-cutoff',
      },
      output: {
        criteria: [
          {
            id: 'entity-cart',
            text: 'Must identify cart service as an entity with filter on resource.attributes.app=cart (evidence: 587 docs; ValkeyCartStore operations in body.text; "Application is shutting down" indicating cart crash after Valkey loss)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'cart' } },
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'cart' } },
                    { match_phrase: { 'body.text': 'connect to redis' } },
                  ],
                },
              },
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'cart' } },
                    { match_phrase: { 'body.text': 'Application is shutting down' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'entity-frontend',
            text: 'Must identify frontend service as an entity (evidence: 1481 docs; gRPC errors "Error: 14 UNAVAILABLE: No connection established. Last error: connect ECONNREFUSED 10.105.181.182:7070" with getCart/addItem call traces)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'frontend' } },
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'frontend' } },
                    { match_phrase: { 'body.text': 'ECONNREFUSED' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'entity-checkout',
            text: 'Must identify checkout service as an entity (evidence: 293 docs; "[PlaceOrder]" and "order confirmation email sent to")',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app': 'checkout' } }],
          },
          {
            id: 'entity-shipping',
            text: 'Must identify shipping service as an entity (evidence: 203 docs; "Sending Quote", "Tracking ID Created" patterns in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'shipping' } }],
          },
          {
            id: 'entity-payment',
            text: 'Must identify payment service as an entity (evidence: 141 docs; attributes.msg="Charge request received" / "Transaction complete")',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'payment' } }],
          },
          {
            id: 'entity-email',
            text: 'Must identify email service as an entity (evidence: 144 docs; POST /send_order_confirmation HTTP/1.1 200 in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'email' } }],
          },
          {
            id: 'entity-recommendation',
            text: 'Must identify recommendation service as an entity (evidence: 232 docs; "Receive ListRecommendations for product ids" from recommendation_server.py)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'recommendation' } }],
          },
          {
            id: 'entity-ad',
            text: 'Must identify ad service as an entity (evidence: 239 docs; "oteldemo.AdService - Targeted ad request received" in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'ad' } }],
          },
          {
            id: 'entity-quote',
            text: 'Must identify quote service as an entity (evidence: 68 docs; POST /getquote HTTP/1.1 200 in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'quote' } }],
          },
          {
            id: 'entity-valkey',
            text: 'Must identify valkey as a cache/data store entity (evidence: 10 docs; cart logs reference ValkeyCartStore; container image valkey/valkey:8-alpine)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'valkey' } }],
          },
          {
            id: 'dep-cart-valkey',
            text: 'Must identify the dependency cart → valkey (evidence: cart logs reference cartservice.cartstore.ValkeyCartStore for GetCartAsync; cart crashed "Application is shutting down" after losing Valkey connection)',
            score: 3,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'cart' } },
              { term: { 'resource.attributes.app': 'valkey' } },
            ],
          },
          {
            id: 'dep-frontend-cart',
            text: 'Must identify the dependency frontend → cart (evidence: 283 frontend gRPC errors "ECONNREFUSED 10.105.181.182:7070" with getCart/addItem call traces showing cart service unreachable)',
            score: 3,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'frontend' } },
              { term: { 'resource.attributes.app': 'cart' } },
            ],
          },
          {
            id: 'dep-checkout-email',
            text: 'Should identify the dependency checkout → email (evidence: checkout logs "order confirmation email sent to" correlating with email POST /send_order_confirmation 200)',
            score: 1,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'checkout' } },
                    { match_phrase: { 'body.text': 'order confirmation email sent to' } },
                  ],
                },
              },
              { term: { 'resource.attributes.app': 'email' } },
            ],
          },
          {
            id: 'error-cart-unreachable',
            text: 'Must reference cart unreachability errors in at least one feature: gRPC code 14 UNAVAILABLE, ECONNREFUSED, "No connection established", "Application is shutting down", or "failed to get user cart during checkout"',
            score: 3,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'frontend' } },
                    { match_phrase: { 'body.text': 'ECONNREFUSED' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'tech-kubernetes',
            text: 'Must identify Kubernetes as infrastructure (evidence: resource.attributes.k8s.node.name=minikube, resource.attributes.k8s.namespace.name=otel-demo)',
            score: 1,
          },
        ],
        min_features: 8,
        max_features: 25,
        required_types: ['entity', 'dependency'],
        expect_entity_filters: true,
        expected_ground_truth:
          'entities=[cart, frontend, checkout, shipping, payment, email, recommendation, ad, quote, valkey], deps=[cart->valkey, frontend->cart, checkout->email, shipping->quote, frontend->checkout], infra=[kubernetes/minikube, otel-demo namespace, otel-collector, arm64 architecture], error_signatures=[ECONNREFUSED 10.105.181.182:7070 cart unreachable, gRPC code 14 UNAVAILABLE, No connection established, Application is shutting down (cart crash), cart failure: failed to get user cart during checkout; frontend observes cart errors via gRPC]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'cart',
        failure_mode: 'redis_cutoff',
      },
    },
    {
      input: {
        scenario_id: 'checkout-memory-starvation',
      },
      output: {
        criteria: [
          {
            id: 'entity-cart',
            text: 'Must identify cart service as an entity with filter on resource.attributes.app=cart (evidence: 1331 docs, highest volume; ValkeyCartStore GetCartAsync/AddItemAsync/EmptyCartAsync operations)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app': 'cart' } }],
          },
          {
            id: 'entity-checkout',
            text: 'Must identify checkout service as an entity with filter on resource.attributes.app=checkout (evidence: 436 docs; "[PlaceOrder]", "payment went through", "order confirmation email sent to" in body.text)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app': 'checkout' } }],
          },
          {
            id: 'entity-shipping',
            text: 'Must identify shipping service as an entity (evidence: 434 docs; "Sending Quote", "Received quote", "Tracking ID Created" patterns)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'shipping' } }],
          },
          {
            id: 'entity-email',
            text: 'Must identify email service as an entity (evidence: 298 docs; POST /send_order_confirmation HTTP/1.1 200)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'email' } }],
          },
          {
            id: 'entity-payment',
            text: 'Must identify payment service as an entity (evidence: 295 docs; attributes.msg="Charge request received" / "Transaction complete")',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'payment' } }],
          },
          {
            id: 'entity-ad',
            text: 'Must identify ad service as an entity (evidence: 244 docs; "oteldemo.AdService - Targeted ad request received")',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'ad' } }],
          },
          {
            id: 'entity-recommendation',
            text: 'Must identify recommendation service as an entity (evidence: 204 docs; "Receive ListRecommendations for product ids" from recommendation_server.py)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'recommendation' } }],
          },
          {
            id: 'entity-quote',
            text: 'Must identify quote service as an entity (evidence: 145 docs; POST /getquote HTTP/1.1 200)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'quote' } }],
          },
          {
            id: 'entity-valkey',
            text: 'Must identify valkey as a cache/data store entity (evidence: 15 docs; cart logs reference ValkeyCartStore; container image valkey/valkey:8-alpine)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'valkey' } }],
          },
          {
            id: 'dep-cart-valkey',
            text: 'Must identify the dependency cart → valkey (evidence: cart logs reference cartservice.cartstore.ValkeyCartStore for GetCartAsync/AddItemAsync/EmptyCartAsync)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'cart' } },
              { term: { 'resource.attributes.app': 'valkey' } },
            ],
          },
          {
            id: 'dep-checkout-payment',
            text: 'Should identify the dependency checkout → payment (evidence: checkout logs "payment went through (transaction_id: ...)")',
            score: 1,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'checkout' } },
              { term: { 'resource.attributes.app': 'payment' } },
            ],
          },
          {
            id: 'dep-checkout-email',
            text: 'Should identify the dependency checkout → email (evidence: checkout logs "order confirmation email sent to" correlating with email POST /send_order_confirmation 200)',
            score: 1,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'checkout' } },
                    { match_phrase: { 'body.text': 'order confirmation email sent to' } },
                  ],
                },
              },
              { term: { 'resource.attributes.app': 'email' } },
            ],
          },
          {
            id: 'dep-shipping-quote',
            text: 'Should identify the dependency shipping → quote (evidence: shipping "Received quote" correlating with quote POST /getquote)',
            score: 1,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'shipping' } },
              { term: { 'resource.attributes.app': 'quote' } },
            ],
          },
          {
            id: 'tech-kubernetes',
            text: 'Must identify Kubernetes as infrastructure (evidence: resource.attributes.k8s.node.name=minikube, resource.attributes.k8s.namespace.name=otel-demo)',
            score: 1,
          },
        ],
        min_features: 8,
        max_features: 25,
        required_types: ['entity', 'dependency'],
        expect_entity_filters: true,
        expected_ground_truth:
          'entities=[cart, checkout, shipping, email, payment, ad, recommendation, quote, valkey], deps=[cart->valkey, checkout->payment, checkout->email, checkout->shipping, shipping->quote], infra=[kubernetes/minikube, otel-demo namespace, otel-collector, arm64 architecture]',
      },
      metadata: {
        difficulty: 'hard',
        failure_domain: 'checkout',
        failure_mode: 'memory_starvation',
      },
    },
  ],
  kiFeatureDeduplication: [
    {
      input: {
        scenario_id: 'healthy-baseline',
        iterations: DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.max_iterations,
      },
    },
    {
      input: {
        scenario_id: 'payment-unreachable',
        iterations: DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.max_iterations,
      },
    },
  ],
  kiFeatureExclusion: [
    {
      input: {
        scenario_id: 'healthy-baseline',
        sample_document_count: 20,
        exclude_count: 4,
        follow_up_runs: 3,
      },
    },
    {
      input: {
        scenario_id: 'healthy-baseline',
        sample_document_count: 20,
        exclude_count: 1,
        follow_up_runs: 3,
      },
    },
  ],
  discovery: [
    {
      input: {
        scenario_id: 'payment-unreachable',
        stream_name: 'logs',
        detections: toInputDetections([
          PAYMENT_UNREACHABLE_CASCADE_DISCOVERY,
          BENIGN_RECOMMENDATION_DISCOVERY,
        ]),
      },
      // Ordered ground-truth continuation chains (by `rule_name`); the continuation eval replays one
      // rule per cycle. Each chain legitimately continues ONE episode, so the agent should reuse a
      // single slug. `cascade` = upstream unreachability → downstream user-facing failure.
      continuationChains: {
        cascade: [
          'gRPC Transport Dialing Errors Reaching Payment',
          'Frontend Payment Charge Failures',
          'Checkout PlaceOrder Failures',
        ],
      },
      output: {
        expected_ground_truth:
          'discoveries=[payment-unreachable-cascade (payment unreachable via dial tcp / i/o timeout; checkout→payment charge failures surfacing as frontend gRPC code 13/14 "failed to charge card"; PlaceOrder blocked), benign-recommendation (successful ListRecommendations volume spike, no failures)]',
        expected_discoveries: [
          PAYMENT_UNREACHABLE_CASCADE_DISCOVERY,
          BENIGN_RECOMMENDATION_DISCOVERY,
        ],
        criteria: [
          {
            id: 'root-cause-payment-unreachable',
            text: 'Identifies the payment service being unreachable at the network/transport layer (dial tcp / i/o timeout / connection refused) as the root cause, rather than blaming checkout or the frontend.',
            score: 3,
          },
          {
            id: 'cascade-grouping',
            text: 'Groups the frontend charge failures, the gRPC transport/dialing errors, and the checkout PlaceOrder failures into a single discovery rooted at the unreachable payment service — not three separate service-scoped discoveries.',
            score: 2,
          },
          {
            id: 'dependency-chain',
            text: 'Names the checkout→payment dependency (charge on PlaceOrder) and the frontend→checkout exposure that makes the failure user-facing.',
            score: 1,
          },
          {
            id: 'separate-benign-recommendation',
            text: 'Keeps the benign recommendation activity spike as a separate discovery (or omits it), and does not lump it into the payment incident.',
            score: 2,
          },
          {
            id: 'error-signatures',
            text: 'Cites observed error signatures ("failed to charge card", gRPC code 13 INTERNAL / code 14 UNAVAILABLE, "dial tcp" / "i/o timeout") rather than generic phrasing.',
            score: 1,
          },
        ],
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'checkout',
        failure_mode: 'payment_unreachable',
      },
    },
    {
      input: {
        scenario_id: 'cart-redis-cutoff',
        stream_name: 'logs',
        detections: [
          {
            detection_id: 'otel-cart-valkey-conn-det',
            rule_name: 'Cart Valkey Connection Failures',
            rule_uuid: 'c3d4e5f6-5555-4a5b-8c9d-0e1f2a3b4c70',
            stream_name: 'logs',
            change_point_type: 'spike',
            p_value: 0.0001,
          },
        ],
      },
      output: {
        criteria: [
          {
            id: 'root-cause-valkey',
            text: 'Must identify that cartservice lost connectivity to its Valkey/Redis backing store (evidence: cart logs "Wasn\'t able to connect to redis", "fail cartservice.cartstore.ValkeyCartStore").',
            score: 3,
          },
          {
            id: 'cart-crash',
            text: 'Should note the cart service crash/shutdown ("Application is shutting down") as part of the episode.',
            score: 2,
          },
          {
            id: 'frontend-impact',
            text: 'Should capture the upstream user impact in frontend (gRPC code 14 UNAVAILABLE, ECONNREFUSED, "failed to get user cart during checkout").',
            score: 2,
          },
        ],
        expected_min_evidence_count: 1,
        expected_ground_truth: 'discoveries=[cartservice-valkey-connection-refused]',
        expected_discoveries: [CART_REDIS_CUTOFF_DISCOVERY],
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'cart',
        failure_mode: 'redis_cutoff',
      },
    },
  ],
  discoveryJudge: [
    {
      id: 'payment-unreachable',
      input: {
        scenario_id: 'payment-unreachable',
        discoveries: [PAYMENT_UNREACHABLE_CASCADE_DISCOVERY, BENIGN_RECOMMENDATION_DISCOVERY],
      },
      output: {
        expected_ground_truth:
          'payment-unreachable cascade (payment unreachable → checkout charge failures → frontend gRPC 13/14, PlaceOrder blocked)=promoted; ' +
          'benign recommendation volume spike (successful ListRecommendations only, no failures)=demoted',
        criteria: [
          {
            id: 'promote-active-cascade',
            text: 'Promotes the payment-unreachable cascade: active charge failures blocking order completion warrant immediate on-call action.',
            score: 3,
          },
          {
            id: 'independent-verification',
            text: "Independently verifies at least one key evidence via execute_esql before deciding — re-runs an esql_query from the cascade discovery's input evidences[] and stamps confirmed: true from its own query results, rather than trusting pre-collected findings at face value.",
            score: 2,
          },
          {
            id: 'demote-benign-recommendation',
            text: 'Demotes the benign recommendation volume spike: successful request volume without failure symptoms or user impact is not an actionable incident.',
            score: 3,
          },
          {
            id: 'do-not-escalate-benign-recommendation',
            text: 'Does not promote or fold the benign recommendation spike into the payment incident; it stays separate non-incident noise.',
            score: 2,
          },
        ],
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'checkout',
        failure_mode: 'payment_unreachable',
      },
    },
  ],
  kiQueryGeneration: [
    {
      input: {
        scenario_id: 'healthy-baseline',
        stream_name: 'logs',
        stream_description:
          'OTel Demo application logs under healthy conditions with normal traffic across all microservices',
      },
      output: {
        criteria: [
          {
            id: 'operational-monitoring',
            text: 'Should generate queries for operational monitoring (e.g., service health, HTTP request patterns, request volume) across the multi-service environment',
            score: 2,
          },
          {
            id: 'error-monitoring',
            text: 'Should generate proactive error detection queries (e.g., generic error/exception patterns, connection failures, dependency errors) even though this is healthy traffic — the model should set up error monitoring based on entity and dependency features',
            score: 2,
            sampling_filters: [
              { match_phrase: { 'body.text': 'otel.javaagent' } },
              { match_phrase: { 'body.text': 'OTLP' } },
              { match_phrase: { 'body.text': 'context deadline exceeded' } },
            ],
          },
          {
            id: 'multi-service-coverage',
            text: 'Generated queries should cover multiple services present in the logs (e.g., cart, checkout, shipping, payment, frontend) using entity scoping via resource.attributes.app when appropriate',
            score: 2,
          },
          {
            id: 'feature-grounded',
            text: 'Queries must be grounded in features from the input (entities, dependencies, dataset_analysis, error_logs) rather than being speculative or based solely on the stream name/description',
            score: 2,
          },
          {
            id: 'stats-aggregate-monitoring',
            text: 'Should generate at least one STATS query for aggregate monitoring (e.g., error rate, traffic volume) when dataset_analysis reveals fields suitable for aggregation. STATS queries should have calibrated thresholds documented in descriptions.',
            score: 1,
          },
        ],
        expected_categories: ['operational', 'error'],
        expect_stats: true,
        expected_ground_truth:
          'queries=[operational monitoring and proactive error detection across OTel Demo microservices (cart, checkout, shipping, payment, frontend, email, recommendation, ad, quote, valkey); operational queries for service health and request patterns; error queries for exception/failure detection grounded in entity and dependency features; STATS queries for aggregate monitoring (error rate, traffic volume) with calibrated thresholds]',
      },
      metadata: {
        difficulty: 'easy',
        failure_domain: 'none',
      },
    },
    {
      input: {
        scenario_id: 'payment-unreachable',
        stream_name: 'logs',
        stream_description:
          'OTel Demo logs where the payment service becomes unreachable, causing charge failures with dial tcp / i/o timeout / connection refused and gRPC transport dialing errors in frontend logs',
      },
      output: {
        criteria: [
          {
            id: 'payment-error-query',
            text: 'Must generate an ES|QL query that catches payment-unreachable errors (evidence: frontend logs contain "failed to charge card", "transport: Error while dialing: dial tcp", "i/o timeout", "connection refused")',
            score: 3,
          },
          {
            id: 'checkout-impact-query',
            text: 'Should generate a query that detects user-facing impact caused by payment unreachability (evidence: frontend logs show gRPC code 13 INTERNAL / code 14 UNAVAILABLE errors from failed payment calls during checkout)',
            score: 2,
          },
          {
            id: 'grpc-transport-query',
            text: 'Should generate a query targeting gRPC transport or connection errors (evidence: "transport: Error while dialing", gRPC code 13 INTERNAL / code 14 UNAVAILABLE in frontend logs)',
            score: 1,
          },
          {
            id: 'stats-error-rate-detection',
            text: 'Should generate a STATS query detecting elevated error rates during the payment-unreachable failure (e.g., error rate spike correlated with the payment service disruption). The STATS query should complement the match-type error detection queries.',
            score: 2,
          },
        ],
        expected_categories: ['error', 'operational'],
        expect_stats: true,
        expected_ground_truth:
          'queries=[error detection for payment charge failures (failed to charge card), gRPC transport/dialing errors (dial tcp, i/o timeout, connection refused) in frontend logs, user-facing impact detection in frontend from failed checkout→payment calls, operational monitoring across OTel Demo microservices; STATS queries for aggregate error rate detection during payment disruption]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'checkout',
        failure_mode: 'payment_unreachable',
      },
    },
    {
      input: {
        scenario_id: 'cart-redis-cutoff',
        stream_name: 'logs',
        stream_description:
          'OTel Demo logs where the cart service loses connectivity to its Valkey/Redis backing store, causing cart operations to fail',
      },
      output: {
        criteria: [
          {
            id: 'cache-error-query',
            text: 'Must generate an ES|QL query that catches Valkey/Redis connection failures (evidence: cart logs contain "Wasn\'t able to connect to redis" and "fail cartservice.cartstore.ValkeyCartStore" — these are the root-cause signals indicating cart lost connectivity to its Valkey backing store)',
            score: 3,
          },
          {
            id: 'cart-service-error-query',
            text: 'Should generate a query detecting cart service errors or crash signals (evidence: cart logs show "Application is shutting down"; the cart crash then causes gRPC code 14 UNAVAILABLE errors with "ECONNREFUSED 10.105.181.182:7070" in frontend logs)',
            score: 2,
            sampling_filters: [
              { match_phrase: { 'body.text': 'otel.javaagent' } },
              { match_phrase: { 'body.text': 'OTLP' } },
              { match_phrase: { 'body.text': 'context deadline exceeded' } },
              { match: { 'body.structured.object.reason': 'BackOff' } },
              { match: { 'body.structured.object.reason': 'Killing' } },
              { match: { 'body.structured.object.reason': 'Started' } },
            ],
          },
          {
            id: 'upstream-impact-query',
            text: 'Should generate a query detecting upstream impact from cart unavailability (evidence: frontend logs show "failed to get user cart during checkout" with gRPC code 13 INTERNAL, and "ECONNREFUSED 10.105.181.182:7070" with gRPC code 14 UNAVAILABLE — checkout has no error logs, all error evidence surfaces in frontend)',
            score: 2,
          },
          {
            id: 'stats-error-rate-detection',
            text: 'Should generate a STATS query detecting elevated error rates or degraded cart operation success rates during the Redis cutoff. The threshold should reflect the severity of the cache failure.',
            score: 2,
          },
        ],
        expected_categories: ['error', 'operational'],
        expect_stats: true,
        expected_ground_truth:
          'queries=[error detection for Valkey/Redis connection failures in cart logs (connect to redis errors), cart service crash/shutdown detection (Application is shutting down), impact detection in frontend from cart unavailability (gRPC UNAVAILABLE ECONNREFUSED, failed to get user cart during checkout), operational monitoring across OTel Demo microservices; STATS queries for aggregate error rate detection during cart cache failure]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'cart',
        failure_mode: 'redis_cutoff',
      },
    },
    {
      input: {
        scenario_id: 'checkout-memory-starvation',
        stream_name: 'logs',
        stream_description:
          'OTel Demo logs during a checkout service disruption with Kubernetes pod lifecycle events (pod termination and rolling update) across a multi-service microservice environment',
      },
      output: {
        criteria: [
          {
            id: 'multi-service-error-monitoring',
            text: 'Should generate error detection queries targeting multiple services (e.g., checkout, cart, payment) either by scoping with resource.attributes.app or by filtering on service-specific log patterns in body.text',
            score: 3,
            sampling_filters: [
              { match_phrase: { 'body.text': 'otel.javaagent' } },
              { match_phrase: { 'body.text': 'OTLP' } },
              { match_phrase: { 'body.text': 'context deadline exceeded' } },
              { match: { 'body.structured.object.reason': 'Killing' } },
              { match: { 'body.structured.object.reason': 'ScalingReplicaSet' } },
              { match: { 'body.structured.object.reason': 'Started' } },
            ],
          },
          {
            id: 'dependency-aware-queries',
            text: 'Should generate queries that reflect dependency relationships (e.g., checkout→payment, cart→valkey, checkout→email) by monitoring communication paths or downstream failure patterns',
            score: 2,
          },
          {
            id: 'operational-monitoring-query',
            text: 'Should generate operational queries for service health monitoring (e.g., order throughput, transaction completions, email confirmations) grounded in entity features and log patterns observed in the data',
            score: 2,
          },
          {
            id: 'stats-component-degradation',
            text: 'Should generate STATS queries detecting per-component error rate spikes or traffic drops that correlate with the checkout disruption. Entity-scoped STATS (BY resource.attributes.app) is preferred when multiple services are affected.',
            score: 2,
          },
        ],
        expected_categories: ['operational', 'error'],
        expect_stats: true,
        expected_ground_truth:
          'queries=[entity-scoped error detection for checkout, cart, payment, and shipping services; dependency-aware monitoring for checkout→payment, cart→valkey, checkout→email, shipping→quote communication paths; operational monitoring for order throughput (PlaceOrder), payment transactions, and email confirmations across OTel Demo microservices; STATS queries for per-component error rate spikes and traffic drops during checkout disruption]',
      },
      metadata: {
        difficulty: 'hard',
        failure_domain: 'checkout',
        failure_mode: 'memory_starvation',
      },
    },
  ],
};
