/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: tells the user that a replaced package's integration policies were moved to its
// replacement ("Nginx OpenTelemetry Input now lives in Nginx OpenTelemetry"). Read from the
// replacement's installation (`moved_from`). Shown on the replacement's page and on the installed
// integrations list. Copy is English only (no i18n) while it's a prototype.

import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';

import type { ReplacedPackageMove } from '../../../../../../common/types';

export interface MovedPackageNotice {
  /** Title of the package the policies moved to */
  replacementTitle: string;
  /** Name of the package the policies moved to */
  replacementName?: string;
  move: ReplacedPackageMove;
}

const policiesText = (n: number) =>
  n === 1 ? '1 integration policy' : `${n} integration policies`;

/** Text of one notice, kept out of the component so it can be unit tested. */
export const getMovedPackageNoticeText = ({
  replacementTitle,
  replacementName,
  move,
}: MovedPackageNotice) => {
  const moved = move.package_policies;
  // Old and new packages can share a title (nginx_otel_integration and nginx_otel on the stack).
  const sameTitle = move.title === replacementTitle;
  const from = sameTitle ? `${move.title} (${move.package})` : move.title;
  const to =
    sameTitle && replacementName ? `${replacementTitle} (${replacementName})` : replacementTitle;
  const unmapped = moved.flatMap((p) => p.unmapped_vars.map((v) => `${p.name} (${v})`));
  return {
    title: `${from} now lives in ${to}`,
    moved: moved.length
      ? `${policiesText(
          moved.length
        )} moved, with the same agent policies, names and settings: ${moved
          .map((p) => p.name)
          .join(', ')}.`
      : `${move.title} had no integration policies to move.`,
    unmapped: unmapped.length
      ? `Settings with no equivalent in ${replacementTitle}, not carried over: ${unmapped.join(
          ', '
        )}.`
      : undefined,
    notMoved: move.not_moved.length
      ? `Still on ${move.title}: ${move.not_moved
          .map((p) => `${p.name} (${p.reason})`)
          .join(', ')}.`
      : undefined,
  };
};

export const MovedPackagesCallout: React.FC<{ notices: MovedPackageNotice[] }> = ({ notices }) => (
  <>
    {notices.map((notice) => {
      const text = getMovedPackageNoticeText(notice);
      return (
        <React.Fragment key={notice.move.package}>
          <KbnInfoCallout
            title={text.title}
            data-test-subj={`movedPackageCallout-${notice.move.package}`}
          >
            <EuiText size="s">
              <p>{text.moved}</p>
              {text.unmapped && <p>{text.unmapped}</p>}
              {text.notMoved && <p>{text.notMoved}</p>}
            </EuiText>
          </KbnInfoCallout>
          <EuiSpacer size="m" />
        </React.Fragment>
      );
    })}
  </>
);

/** Notices of every installed package in `items` that replaced others. */
export const getMovedPackageNotices = (
  items: Array<{
    name: string;
    title: string;
    installationInfo?: { moved_from?: ReplacedPackageMove[] };
  }>
): MovedPackageNotice[] =>
  items.flatMap((item) =>
    (item.installationInfo?.moved_from ?? []).map((move) => ({
      replacementTitle: item.title,
      replacementName: item.name,
      move,
    }))
  );
