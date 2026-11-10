/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_INFRASTRUCTURE_ICON,
  DEFAULT_SERVICE_ICON,
  resolveEntityIcon,
} from './entity_icons';
import { KNOWN_EUI_ICONS } from './built_in_types';

describe('resolveEntityIcon', () => {
  it('keeps a named EUI icon on the type', () => {
    expect(
      resolveEntityIcon({
        id: 'host',
        label: 'Host',
        kind: 'infrastructure',
        icon: { eui_icon: 'compute' },
      })
    ).toBe('compute');
  });

  it('guesses from the type and entity label when the agent left the icon bare', () => {
    expect(
      resolveEntityIcon(
        { id: 'service', label: 'Service', kind: 'service' },
        'Constructor'
      )
    ).toBe('gear');
    expect(
      resolveEntityIcon(
        { id: 'service', label: 'Service', kind: 'service' },
        'Allocators'
      )
    ).toBe('compute');
    expect(
      resolveEntityIcon(
        { id: 'service', label: 'Service', kind: 'service' },
        'europe-west2-b'
      )
    ).toBe('logoGCP');
    expect(
      resolveEntityIcon(
        { id: 'service', label: 'Service', kind: 'service' },
        'kube-dns'
      )
    ).toBe('logoKubernetes');
    expect(
      resolveEntityIcon(
        { id: 'service', label: 'Service', kind: 'service' },
        'kibana-background'
      )
    ).toBe('logoKibana');
    expect(
      resolveEntityIcon(
        { id: 'service', label: 'Service', kind: 'service' },
        'Nightshift investigation'
      )
    ).toBe('sparkles');
    expect(
      resolveEntityIcon(
        { id: 'service', label: 'Service', kind: 'service' },
        'credproxy'
      )
    ).toBe('merge');
    expect(
      resolveEntityIcon(
        { id: 'service', label: 'Service', kind: 'service' },
        'sandbox-api'
      )
    ).toBe('plugs');
    expect(
      resolveEntityIcon(
        { id: 'service', label: 'Service', kind: 'service' },
        'Hosted Elasticsearch deployments'
      )
    ).toBe('logoElastic');
  });

  it('falls back to a kind default so a node is never empty', () => {
    expect(
      resolveEntityIcon({ id: 'service', label: 'Service', kind: 'service' }, 'frontend')
    ).toBe(DEFAULT_SERVICE_ICON);
    expect(
      resolveEntityIcon(
        { id: 'mystery', label: 'Mystery box', kind: 'infrastructure' },
        'unknown-thing'
      )
    ).toBe(DEFAULT_INFRASTRUCTURE_ICON);
    expect(resolveEntityIcon(undefined)).toBe(DEFAULT_SERVICE_ICON);
  });

  it('only returns icons EUI knows', () => {
    const known = new Set<string>(KNOWN_EUI_ICONS);
    for (const label of [
      'Constructor',
      'Allocators',
      'europe-west2-b',
      'sandbox-api',
      'product-catalog-pod-kill',
    ]) {
      expect(known.has(resolveEntityIcon({ id: 'service', label: 'Service', kind: 'service' }, label))).toBe(
        true
      );
    }
  });
});
