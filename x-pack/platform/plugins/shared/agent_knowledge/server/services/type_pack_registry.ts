/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentKnowledgeProduct, WikiTypePack } from '@kbn/agent-knowledge-common';

export interface TypePackRegistry {
  register: (pack: WikiTypePack) => void;
  get: (product: AgentKnowledgeProduct) => WikiTypePack | undefined;
  getByAiIndexId: (aiIndexId: string) => WikiTypePack | undefined;
  /** Binds an AI index registry id to a registered product type pack. */
  bindAiIndex: (aiIndexId: string, product: AgentKnowledgeProduct) => void;
  list: () => WikiTypePack[];
}

export const createTypePackRegistry = ({ logger }: { logger: Logger }): TypePackRegistry => {
  const byProduct = new Map<AgentKnowledgeProduct, WikiTypePack>();
  const aiIndexToProduct = new Map<string, AgentKnowledgeProduct>();

  return {
    register(pack) {
      if (byProduct.has(pack.product)) {
        logger.warn(
          `Wiki type pack for product "${pack.product}" is already registered; replacing it`
        );
      }
      byProduct.set(pack.product, pack);
    },

    get(product) {
      return byProduct.get(product);
    },

    getByAiIndexId(aiIndexId) {
      const product = aiIndexToProduct.get(aiIndexId);
      return product === undefined ? undefined : byProduct.get(product);
    },

    bindAiIndex(aiIndexId, product) {
      if (!byProduct.has(product)) {
        throw new Error(
          `Cannot bind AI index "${aiIndexId}" to unregistered wiki type pack "${product}"`
        );
      }
      aiIndexToProduct.set(aiIndexId, product);
    },

    list() {
      return [...byProduct.values()];
    },
  };
};
