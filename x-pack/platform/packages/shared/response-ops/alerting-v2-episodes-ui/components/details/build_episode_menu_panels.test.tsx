/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { FlyoutFooterMenuCustomItem, FlyoutFooterMenuItem } from '@kbn/flyout-template';
import type { EpisodeAction } from '../../actions/types';
import { buildEpisodeMenuPanels } from './build_episode_menu_panels';

const episodes: AlertEpisode[] = [
  {
    '@timestamp': '2026-01-01T00:00:00.000Z',
    'episode.id': 'ep-1',
    'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
    'rule.id': 'rule-1',
    group_hash: 'hash-1',
    first_timestamp: '2026-01-01T00:00:00.000Z',
    last_timestamp: '2026-01-01T01:00:00.000Z',
    duration: 3600000,
  },
];

const makeAction = (id: string, overrides?: Partial<EpisodeAction>): EpisodeAction => ({
  id,
  order: 0,
  displayName: `Action ${id}`,
  iconType: 'check',
  isCompatible: () => true,
  execute: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

type PlainItem = FlyoutFooterMenuItem & {
  'data-test-subj'?: string;
  onClick?: () => void;
  href?: string;
};

const getItems = (actions: EpisodeAction[], viewDetailsHref?: string | null) =>
  buildEpisodeMenuPanels({ actions, episodes, viewDetailsHref, onSuccess: jest.fn() })[0]?.items as
    | PlainItem[]
    | undefined;

const describeItems = (items: PlainItem[] = []) =>
  items.map((item) => {
    if ('isSeparator' in item) return '|';
    if ('renderItem' in item) return `custom:${(item as FlyoutFooterMenuCustomItem).key}`;
    return item['data-test-subj'];
  });

describe('buildEpisodeMenuPanels', () => {
  it('orders view details, then workflow actions, then the remaining actions', () => {
    const items = getItems(
      [
        makeAction('ALERTING_V2_EDIT_EPISODE_TAGS'),
        makeAction('ALERTING_V2_ACK_EPISODE'),
        makeAction('CUSTOM_WORKFLOW', { isWorkflowAction: true }),
      ],
      '/alerts/ep-1'
    );

    expect(describeItems(items)).toEqual([
      'alertingV2EpisodeTakeAction-viewDetails',
      '|',
      'alertingV2EpisodeTakeAction-ALERTING_V2_ACK_EPISODE',
      'alertingV2EpisodeTakeAction-CUSTOM_WORKFLOW',
      '|',
      'alertingV2EpisodeTakeAction-ALERTING_V2_EDIT_EPISODE_TAGS',
    ]);
  });

  it('links view details to the href and leaves it without an onClick', () => {
    const [viewDetails] = getItems([], '/alerts/ep-1') ?? [];

    expect(viewDetails.href).toBe('/alerts/ep-1');
    expect(viewDetails.onClick).toBeUndefined();
  });

  it('returns no panels when there is no action and no view details link', () => {
    expect(
      buildEpisodeMenuPanels({ actions: [], episodes, viewDetailsHref: null, onSuccess: jest.fn() })
    ).toEqual([]);
  });

  it('runs a plain action with the episodes and onSuccess', () => {
    const onSuccess = jest.fn();
    const ack = makeAction('ALERTING_V2_ACK_EPISODE');
    const [panel] = buildEpisodeMenuPanels({ actions: [ack], episodes, onSuccess });

    (panel.items[0] as PlainItem).onClick?.();

    expect(ack.execute).toHaveBeenCalledWith({ episodes, onSuccess });
  });

  it('turns an action that renders its own entry into a custom item that receives closeMenu', () => {
    const onSuccess = jest.fn();
    const renderMenuItem = jest.fn(() => <span>Own entry</span>);
    const assignee = makeAction('ALERTING_V2_EDIT_EPISODE_ASSIGNEE', { renderMenuItem });
    const [panel] = buildEpisodeMenuPanels({ actions: [assignee], episodes, onSuccess });
    const item = panel.items[0] as FlyoutFooterMenuCustomItem;
    const closeMenu = jest.fn();

    item.renderItem({ closeMenu });

    expect(item.key).toBe('ALERTING_V2_EDIT_EPISODE_ASSIGNEE');
    expect(renderMenuItem).toHaveBeenCalledWith({
      episodes,
      onSuccess,
      closeMenu,
      surface: 'details_flyout',
    });
    expect(assignee.execute).not.toHaveBeenCalled();
  });
});
