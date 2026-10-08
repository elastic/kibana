/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

// Long lists don't fit the card description, so name the first few and count the rest.
const MAX_NAMED_MEMBERS = 3;

// Locale-aware "A, B, C and N more", with each named service in bold.
const renderMemberList = (memberTitles: string[]): React.ReactNode[] => {
  const named = memberTitles.slice(0, MAX_NAMED_MEMBERS);
  const hiddenCount = memberTitles.length - named.length;
  const items =
    hiddenCount > 0
      ? [
          ...named,
          i18n.translate('xpack.fleet.packageCard.searchMemberMatch.more', {
            defaultMessage: '{count} more',
            values: { count: hiddenCount },
          }),
        ]
      : named;

  let elementIndex = 0;
  return new Intl.ListFormat(i18n.getLocale(), { style: 'long', type: 'conjunction' })
    .formatToParts(items)
    .map((part, index) => {
      if (part.type === 'literal') {
        return <React.Fragment key={index}>{part.value}</React.Fragment>;
      }
      // Only the named services are bold, not the trailing "N more".
      const isServiceName = elementIndex++ < named.length;
      return isServiceName ? (
        <strong key={index}>{part.value}</strong>
      ) : (
        <React.Fragment key={index}>{part.value}</React.Fragment>
      );
    });
};

/** Card description explaining which bundled services the user's search matched. */
export const SearchMemberMatchDescription = ({
  memberTitles,
  collectionTitle,
}: {
  memberTitles: string[];
  collectionTitle: string;
}) => (
  // A single wrapper keeps the sentence one inline child: the card clamps its description with
  // `display: -webkit-box`, which would lay out each bold name and text piece as a separate box.
  <span>
    <FormattedMessage
      id="xpack.fleet.packageCard.searchMemberMatch"
      defaultMessage="{members} {count, plural, one {is} other {are}} part of the {collection} collection."
      values={{
        members: renderMemberList(memberTitles),
        count: memberTitles.length,
        collection: collectionTitle,
      }}
    />
  </span>
);
