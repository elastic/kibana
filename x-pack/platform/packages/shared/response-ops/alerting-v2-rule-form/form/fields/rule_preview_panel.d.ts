import React from 'react';
/**
 * Layout-aware wrapper for the rule and recovery results previews.
 *
 * - **Page layout**: Renders both previews inline (for side-by-side placement).
 *   The recovery preview is only shown when the recovery policy type is `'query'`.
 * - **Flyout layout**: Renders a trigger button that opens a nested flyout
 *   containing both previews.
 */
export declare const RulePreviewPanel: () => React.JSX.Element;
