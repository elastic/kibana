/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { LinkNode } from '@kbn/isomer-components';
import { lazySchema, z } from '@kbn/zod';
import type { MaterializedNode } from '../materialize/nodes';
import type { Materializer } from '../materialize/types';
import { createUnsupportedNode } from '../materialize/unsupported';
import { escapeMarkdownText, isAbsoluteHttpUrl, markdownDestination } from './markdown_text';

export const LINKS_SAVED_OBJECT_TYPE = 'links';

const DASHBOARD_SAVED_OBJECT_TYPE = 'dashboard';
/** The most characters a `link` label and URL take, as its schema allows. */
const MAX_LINK_LABEL = 75;
const MAX_LINK_URL = 3000;

/** A Links panel's as-code config, by value, as the links embeddable's schema shapes it. */
const linksConfigSchema = lazySchema(() =>
  z
    .object({
      title: z.string().optional(),
      layout: z.enum(['horizontal', 'vertical']).optional(),
      links: z
        .array(
          z.discriminatedUnion('type', [
            z
              .object({
                type: z.literal('dashboardLink'),
                destination: z.string(),
                label: z.string().optional(),
              })
              .loose(),
            z
              .object({
                type: z.literal('externalLink'),
                destination: z.string(),
                label: z.string().optional(),
                options: z.object({ encode_url: z.boolean().optional() }).loose().optional(),
              })
              .loose(),
          ])
        )
        .max(100),
    })
    .loose()
);

type ParsedLinks = z.output<typeof linksConfigSchema>;

export interface LinksConfig extends ParsedLinks {
  /** The titles of the dashboards links point to, by ID, for links without a label. */
  dashboardTitles?: Record<string, string>;
  /** The path to Kibana in the request's space, for dashboard links outside a `link` node. */
  kibanaUrl?: string;
}

export interface LinksMaterializerDeps {
  getKibanaUrl: (request: KibanaRequest) => string;
}

const emptyReason = () =>
  i18n.translate('xpack.isomer.materialize.links.empty', {
    defaultMessage: 'This links panel has no links.',
  });

const dashboardErrorLabel = () =>
  i18n.translate('xpack.isomer.materialize.links.dashboardError', {
    defaultMessage: 'Error fetching dashboard',
  });

/** One link as the links panel shows it: its label, and where it goes when it can go anywhere. */
interface ShownLink {
  label: string;
  /** A Kibana app route, for dashboards. */
  app?: { app: string; path: string };
  url?: string;
}

const dashboardPath = (id: string) => `#/view/${encodeURIComponent(id)}`;

/** Each link's label and target, as the links panel's dashboard and external link components choose them. */
const shownLinks = ({ links, dashboardTitles = {} }: LinksConfig): ShownLink[] =>
  links.map((link): ShownLink => {
    if (link.type === 'dashboardLink') {
      const title = dashboardTitles[link.destination];
      return title === undefined && !link.label
        ? { label: dashboardErrorLabel() }
        : {
            label: link.label || (title ?? ''),
            app: { app: 'dashboards', path: dashboardPath(link.destination) },
          };
    }
    const url = link.options?.encode_url === false ? link.destination : encodeURI(link.destination);
    return { label: link.label || link.destination, ...(url ? { url } : {}) };
  });

/** A single link as a components pack `link`, when it fits one. */
const asLinkNode = ({ label, app, url }: ShownLink): LinkNode | undefined => {
  const text = label.replace(/\s+/g, ' ').trim();
  if (!text || text.length > MAX_LINK_LABEL) {
    return undefined;
  }
  if (app) {
    return { type: 'link', label: text, ...app };
  }
  return url && url.length <= MAX_LINK_URL && isAbsoluteHttpUrl(url)
    ? { type: 'link', label: text, url }
    : undefined;
};

/** Links as Markdown: a list, or one line for a horizontal layout. Links that go nowhere are text. */
const asMarkdown = (links: ShownLink[], { layout, kibanaUrl = '' }: LinksConfig): string => {
  const items = links.map(({ label, app, url }) => {
    const text = escapeMarkdownText(label);
    const href = app ? `${kibanaUrl}/app/${app.app}${app.path}` : url;
    return href ? `[${text}](${markdownDestination(href)})` : text;
  });
  return layout === 'horizontal' ? items.join(' · ') : items.map((item) => `- ${item}`).join('\n');
};

/**
 * Materializes a dashboard Links panel by value: one link as the components pack's `link`, and
 * several as `markdown`, a list or, for a horizontal layout, one line. Dashboard links show the
 * linked dashboard's title when they have no label of their own, as the links panel does.
 */
export const createLinksMaterializer = ({
  getKibanaUrl,
}: LinksMaterializerDeps): Materializer<LinksConfig> => ({
  version: 1,

  parse: (config) => linksConfigSchema.parse(config),

  resolve: async (config, { request, savedObjectsClient }) => {
    const unlabeled = [
      ...new Set(
        config.links
          .filter((link) => link.type === 'dashboardLink' && !link.label)
          .map(({ destination }) => destination)
      ),
    ];
    const dashboardTitles: Record<string, string> = {};
    if (unlabeled.length > 0) {
      const { saved_objects: dashboards } = await savedObjectsClient.bulkGet<{ title?: unknown }>(
        unlabeled.map((id) => ({ type: DASHBOARD_SAVED_OBJECT_TYPE, id, fields: ['title'] }))
      );
      for (const dashboard of dashboards) {
        if (
          !isSavedObjectErrorResult(dashboard) &&
          typeof dashboard.attributes.title === 'string'
        ) {
          dashboardTitles[dashboard.id] = dashboard.attributes.title;
        }
      }
    }
    return { ...config, dashboardTitles, kibanaUrl: getKibanaUrl(request) };
  },

  describe: ({ title }) => (title ? { title } : {}),

  plan: ({ links, title }) =>
    links.length > 0 ? [] : createUnsupportedNode(emptyReason(), { title }),

  map: (config): MaterializedNode => {
    const links = shownLinks(config);
    const single = links.length === 1 ? asLinkNode(links[0]) : undefined;
    return single ?? { type: 'markdown', text: asMarkdown(links, config) };
  },
});
