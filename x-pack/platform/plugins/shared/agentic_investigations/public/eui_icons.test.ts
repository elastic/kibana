/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KNOWN_EUI_ICONS } from '../common';
import { EVENT_GROUPS } from './conversation_templates/templates/investigation/flyout/impact_map_events';

// An icon name EUI does not know is drawn as a broken image, so every name we write by hand, and
// every name the agent may pick, has to exist.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { typeToPathMap } = require('@elastic/eui/lib/components/icon/icon_map') as {
  typeToPathMap: Record<string, string>;
};

describe('EUI icon names', () => {
  it.each(EVENT_GROUPS.map(({ id, icon }) => [id, icon]))(
    'knows the icon of the %s event kind (%s)',
    (_kind, icon) => {
      expect(typeToPathMap).toHaveProperty([icon]);
    }
  );

  it.each(['warning', 'checkCircleFill', 'graphApp', 'clock'])('knows the card icon %s', (icon) => {
    expect(typeToPathMap).toHaveProperty([icon]);
  });

  it('knows every icon an agent may pick for an entity type', () => {
    const unknown = KNOWN_EUI_ICONS.filter((icon) => !(icon in typeToPathMap));
    expect(unknown).toEqual([]);
  });
});
