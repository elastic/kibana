import type { DependencyList } from 'react';
import type { ChromeBadge } from '@kbn/core-chrome-browser';
export type { ChromeBadge };
/**
 * Renders a badge in the Kibana chrome.
 * @param badge Params of the badge or `undefined` to render no badge.
 * @param badge.iconType Icon type of the badge shown in the Kibana chrome.
 * @param badge.text Title of tooltip displayed when hovering the badge.
 * @param badge.tooltip Description of tooltip displayed when hovering the badge.
 * @param deps If present, badge will be updated or removed if the values in the list change.
 */
export declare function useBadge(badge: ChromeBadge | undefined, deps?: DependencyList): void;
