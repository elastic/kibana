/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The by-reference name every embeddable's `transformIn` emits since Kibana 9.4; the dashboard prefixes it with the panel id. */
const SAVED_OBJECT_REF_NAME = 'savedObjectRef';

interface PanelWithReference {
  panelIndex?: string;
  panelRefName?: string;
  gridData?: { i?: string };
}

/**
 * The dashboard reference that holds a by-reference panel's saved object, or `undefined` for a by-value panel.
 * Before 9.4 the panel named it in `panelRefName`, bare or prefixed with the panel id; since 9.4 it is `<panel id>:savedObjectRef`.
 */
export const findPanelReference = <R extends { name: string }>(
  panel: PanelWithReference,
  references: readonly R[] | undefined
): R | undefined => {
  const panelId = panel.panelIndex ?? panel.gridData?.i;
  const { panelRefName } = panel;
  if (panelRefName) {
    return references?.find(
      ({ name }) =>
        name === panelRefName ||
        name === `${panelId ?? ''}:${panelRefName}` ||
        name.endsWith(`:${panelRefName}`)
    );
  }
  if (!panelId) {
    return undefined;
  }
  return references?.find(({ name }) => name === `${panelId}:${SAVED_OBJECT_REF_NAME}`);
};
