/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { EuiLink, EuiMarkdownFormat, getDefaultEuiMarkdownPlugins } from '@elastic/eui';
import type { InvestigationImpactMapResponse } from '../../common';
import {
  ImpactMapEventsFlyout,
  resolveEventsSelection,
  type EventsSelection,
} from '../conversation_templates/templates/investigation/flyout/impact_map_events';
import { useIsInAgentBuilder } from '../conversation_templates/templates/investigation/flyout/use_is_in_agent_builder';

type EventLinksImpactMap = Pick<
  InvestigationImpactMapResponse,
  'entities' | 'relationships' | 'events' | 'entity_types'
> &
  Partial<Pick<InvestigationImpactMapResponse, 'relationship_types'>>;

interface EventLinks {
  hasEvent: (id: string) => boolean;
  openEvent: (id: string) => void;
  openEntity: (id: string) => void;
}

const EventLinksContext = createContext<EventLinks | undefined>(undefined);

const LINK_PREFIX = '/event-link/';
const EVENT_LINK = /\]\(event:([^)\s]*)\)/g;

/**
 * The recorder writes `[words](event:<id>)`. Markdown only lets a few protocols through, so the
 * id moves into a relative path, which the link component below recognises.
 */
export const toEventHref = (markdown: string): string =>
  markdown
    // The model sometimes writes a line break as the two characters backslash and n.
    .replace(/\\n/g, '\n')
    .replace(EVENT_LINK, (_match, id: string) => `](${LINK_PREFIX}${encodeURIComponent(id)})`);

export const parseEventHref = (href: string | undefined): string | undefined =>
  href?.startsWith(LINK_PREFIX) ? decodeURIComponent(href.slice(LINK_PREFIX.length)) : undefined;

/**
 * Lets event links in the text below open that event in a flyout, over whatever flyout the text
 * is in. Without it (or for an id the record does not hold) a link reads as plain text.
 */
export const EventLinksProvider: React.FC<
  React.PropsWithChildren<{ impactMap: EventLinksImpactMap | undefined }>
> = ({ impactMap, children }) => {
  const [selection, setSelection] = useState<EventsSelection>();
  const isInAgentBuilder = useIsInAgentBuilder();
  const events = impactMap?.events;

  const links = useMemo<EventLinks | undefined>(
    () =>
      events
        ? {
            hasEvent: (id) => events.some((event) => event.id === id),
            openEvent: (id) => setSelection({ kind: 'event', id }),
            openEntity: (id) => setSelection({ kind: 'entity', id }),
          }
        : undefined,
    [events]
  );

  return (
    <EventLinksContext.Provider value={links}>
      {children}
      {impactMap && selection && (
        <ImpactMapEventsFlyout
          targetKey={`${selection.kind}:${selection.id}`}
          {...resolveEventsSelection(selection, impactMap)}
          impactMap={impactMap}
          asMainFlyout={isInAgentBuilder}
          onClose={() => setSelection(undefined)}
        />
      )}
    </EventLinksContext.Provider>
  );
};

export const useEventLinks = (): EventLinks | undefined => useContext(EventLinksContext);

/** Markdown whose `event:` links open the event they name. */
export const EventMarkdown: React.FC<{
  text: string;
  textSize?: 'xs' | 's' | 'm';
  color?: 'subdued';
}> = ({ text, textSize = 's', color }) => {
  const links = useContext(EventLinksContext);

  const processingPlugins = useMemo(() => {
    const { processingPlugins: plugins } = getDefaultEuiMarkdownPlugins();
    plugins[1][1].components.a = ({
      href,
      children,
    }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      const eventId = parseEventHref(href);
      if (eventId === undefined) {
        return (
          <EuiLink href={href} target="_blank">
            {children}
          </EuiLink>
        );
      }
      // A link to an event the record no longer holds is only words.
      if (!links?.hasEvent(eventId)) {
        return <>{children}</>;
      }
      return (
        <EuiLink
          data-test-subj="agenticInvestigationsEventLink"
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation();
            links.openEvent(eventId);
          }}
        >
          {children}
        </EuiLink>
      );
    };
    return plugins;
  }, [links]);

  const markdown = useMemo(() => toEventHref(text), [text]);

  return (
    <EuiMarkdownFormat textSize={textSize} color={color} processingPluginList={processingPlugins}>
      {markdown}
    </EuiMarkdownFormat>
  );
};
