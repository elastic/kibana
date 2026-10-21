/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export const recordMetricRenderErrors = async (page: ScoutPage) => {
  const recording = await page.evaluateHandle(() => {
    const errors = new Set<string>();
    const inspectText = (text: string | null) => {
      if (text?.includes('Provided column name or index is invalid')) {
        errors.add(text.trim());
      }
    };
    const inspectNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        inspectText(node.textContent);
        return;
      }
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      while (textNode) {
        inspectText(textNode.textContent);
        textNode = walker.nextNode();
      }
    };
    const processRecords = (records: MutationRecord[]) => {
      for (const record of records) {
        if (record.type === 'characterData') {
          inspectText(record.oldValue);
          inspectText(record.target.textContent);
        }
        // Removed nodes can contain an error that appeared and recovered within one callback.
        record.addedNodes.forEach(inspectNode);
        record.removedNodes.forEach(inspectNode);
      }
    };
    const observer = new MutationObserver(processRecords);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true,
    });
    inspectNode(document.body);

    return {
      read: () => {
        processRecords(observer.takeRecords());
        return [...errors];
      },
      disconnect: () => observer.disconnect(),
    };
  });

  return {
    getErrors: () => recording.evaluate((recorder) => recorder.read()),
    dispose: async () => {
      await recording.evaluate((recorder) => recorder.disconnect());
      await recording.dispose();
    },
  };
};
