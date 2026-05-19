/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import type { Feature } from '@kbn/streams-schema';
import { KnowledgeIndicatorFeatureDetailsContent } from './knowledge_indicator_feature_details_content';

function makeFeature(overrides: Partial<Feature> & Pick<Feature, 'id' | 'type'>): Feature {
  return {
    stream_name: 'logs.otel',
    description: '',
    properties: {},
    confidence: 80,
    uuid: overrides.id,
    status: 'active',
    last_seen: '2026-04-19T08:43:02.482Z',
    expires_at: '2026-08-10T14:00:57Z',
    ...overrides,
  };
}

function makeFeatureKI(
  overrides: Partial<Feature> & Pick<Feature, 'id' | 'type'>
): KnowledgeIndicator {
  return { kind: 'feature', feature: makeFeature(overrides) };
}

const cartServiceFeature = makeFeature({
  id: 'cart-service',
  type: 'entity',
  subtype: 'service',
  title: 'Cart Service',
  description:
    'Cart service in the otel-demo application handles cart retrieval through a Valkey-backed cart store. Current logs add direct evidence of the ValkeyCartStore implementation being invoked for GetCartAsync requests.',
  confidence: 94,
  properties: { name: 'cart', technology: 'valkey' },
  tags: ['entity', 'service', 'cart', 'valkey', 'kubernetes'],
  evidence: [
    'resource.attributes.app=cart',
    'resource.attributes.k8s.deployment.name=cart',
    'resource.attributes.container.image.tag=1.12.0-cartservice',
    'info: cartservice.cartstore.ValkeyCartStore[0]',
    'GetCartAsync called with userId=',
  ],
  meta: {
    image_name: 'ghcr.io/open-telemetry/demo',
    note: 'Application logs reference ValkeyCartStore, indicating a Valkey-backed cart store within the cart service.',
    kubernetes_namespace: 'otel-demo',
    container_name: 'cart',
    pod_example: 'cart-7cf546695d-hjpwr',
    store_implementation: 'cartservice.cartstore.ValkeyCartStore',
  },
});

const checkoutServiceKI = makeFeatureKI({
  id: 'checkout-service',
  type: 'entity',
  subtype: 'service',
  title: 'Checkout Service',
  description:
    'Checkout service orchestrates order processing in the otel-demo application. Current logs add direct evidence that checkout handles PlaceOrder requests with USD user currency context and records successful payment completion with transaction identifiers.',
  confidence: 92,
  properties: { name: 'checkout' },
  tags: ['entity', 'service', 'checkout', 'kubernetes', 'orders'],
  evidence: [
    'resource.attributes.app=checkout',
    'resource.attributes.k8s.deployment.name=checkout',
    'payment went through (transaction_id: 722ef666-a214-4dd7-b969-8a5e16b9a83d)',
    'order confirmation email sent to "moore@example.com"',
  ],
  meta: {
    kubernetes_namespace: 'otel-demo',
    image_tag: '1.12.0-checkoutservice',
  },
});

const paymentServiceKI = makeFeatureKI({
  id: 'payment-service',
  type: 'entity',
  subtype: 'service',
  title: 'Payment Service',
  description:
    'Payment service in the otel-demo application runs as the payment Kubernetes deployment and exposes a gRPC server on port 50051.',
  confidence: 95,
  properties: { protocol: 'grpc', name: 'payment', currency: 'USD', technology: 'nodejs' },
  tags: ['entity', 'service', 'payment', 'grpc', 'nodejs', 'kubernetes'],
  evidence: [
    'resource.attributes.app=payment',
    'PaymentService gRPC server started on port 50051',
    'Charge request received.',
    'attributes.msg=Transaction complete.',
  ],
  meta: {
    port: 50051,
    security_note: 'Logs contain full credit card number and CVV in plaintext request fields.',
  },
});

const emailServiceKI = makeFeatureKI({
  id: 'email-service',
  type: 'entity',
  subtype: 'service',
  title: 'Email Service',
  description:
    'Email service in the otel-demo application sends order confirmation emails over an HTTP endpoint.',
  confidence: 94,
  properties: { protocol: 'http', name: 'email' },
  tags: ['entity', 'service', 'email', 'http', 'kubernetes'],
});

const frontendKI = makeFeatureKI({
  id: 'frontend',
  type: 'entity',
  subtype: 'service',
  title: 'Frontend',
  description:
    'Frontend service for the otel-demo application runs as the Kubernetes frontend deployment and serves a Next.js web application over Node.js.',
  confidence: 95,
  properties: { framework: 'nextjs', name: 'frontend', technology: 'nodejs' },
  tags: ['entity', 'service', 'frontend', 'nodejs', 'nextjs'],
});

const valkeyKI = makeFeatureKI({
  id: 'valkey',
  type: 'technology',
  subtype: 'database_engine',
  title: 'Valkey',
  description:
    'Valkey runs as a standalone deployment in the otel-demo namespace and persists in-memory database state to disk.',
  confidence: 88,
  properties: { name: 'valkey', technology: 'valkey' },
  tags: ['technology', 'database', 'cache', 'valkey'],
});

const cartServiceKI: KnowledgeIndicator = { kind: 'feature', feature: cartServiceFeature };

const depFrontendToCart = makeFeatureKI({
  id: 'frontend-cart-grpc',
  type: 'dependency',
  subtype: 'service_dependency',
  title: 'frontend → cart',
  confidence: 86,
  properties: { protocol: 'grpc', source: 'frontend', target: 'cart' },
  tags: ['dependency', 'grpc', 'frontend', 'cart'],
});

const depCartToValkey = makeFeatureKI({
  id: 'cart-valkey-store',
  type: 'dependency',
  subtype: 'service_dependency',
  title: 'cart → Valkey',
  confidence: 80,
  properties: { protocol: 'internal', source: 'cart', target: 'valkey' },
  tags: ['dependency', 'service', 'valkey', 'cart-store'],
});

const depCheckoutToPayment = makeFeatureKI({
  id: 'checkout-payment-transaction',
  type: 'dependency',
  subtype: 'service_dependency',
  title: 'checkout → payment',
  confidence: 82,
  properties: { protocol: 'internal', source: 'checkout', target: 'payment' },
  tags: ['dependency', 'service', 'payment'],
});

const depCheckoutToEmail = makeFeatureKI({
  id: 'checkout-email-http',
  type: 'dependency',
  subtype: 'service_dependency',
  title: 'checkout → email',
  confidence: 76,
  properties: { protocol: 'http', source: 'checkout', target: 'email' },
  tags: ['dependency', 'service_dependency', 'email', 'http'],
});

const allKnowledgeIndicators: KnowledgeIndicator[] = [
  cartServiceKI,
  checkoutServiceKI,
  paymentServiceKI,
  emailServiceKI,
  frontendKI,
  valkeyKI,
  depFrontendToCart,
  depCartToValkey,
  depCheckoutToPayment,
  depCheckoutToEmail,
];

const meta: Meta<typeof KnowledgeIndicatorFeatureDetailsContent> = {
  component: KnowledgeIndicatorFeatureDetailsContent,
  title: 'streams/KnowledgeIndicatorFeatureDetailsContent',
};

export default meta;
type Story = StoryObj<typeof KnowledgeIndicatorFeatureDetailsContent>;

export const EntityWithDependencies: Story = {
  args: {
    feature: cartServiceFeature,
    allKnowledgeIndicators,
    onNavigateTo: action('onNavigateTo'),
  },
};

export const EntityWithMultipleDependencies: Story = {
  args: {
    feature: checkoutServiceKI.kind === 'feature' ? checkoutServiceKI.feature : cartServiceFeature,
    allKnowledgeIndicators,
    onNavigateTo: action('onNavigateTo'),
  },
};

export const EntityNoDependencies: Story = {
  args: {
    feature: paymentServiceKI.kind === 'feature' ? paymentServiceKI.feature : cartServiceFeature,
    allKnowledgeIndicators,
    onNavigateTo: action('onNavigateTo'),
  },
};

export const DependencyFeature: Story = {
  args: {
    feature:
      depCheckoutToPayment.kind === 'feature' ? depCheckoutToPayment.feature : cartServiceFeature,
    allKnowledgeIndicators,
    onNavigateTo: action('onNavigateTo'),
  },
};

export const WithoutAllKnowledgeIndicators: Story = {
  args: {
    feature: cartServiceFeature,
  },
};

export const MinimalFeature: Story = {
  args: {
    feature: makeFeature({
      id: 'isolated-service',
      type: 'entity',
      subtype: 'service',
      title: 'Isolated Service',
    }),
    allKnowledgeIndicators: [],
    onNavigateTo: action('onNavigateTo'),
  },
};
