/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import 'moment-duration-format';
import React from 'react';
import { formatTimestampToDuration } from '../../../common/format_timestamp_to_duration';
import { CALCULATE_DURATION_UNTIL } from '../../../common/constants';
import { EuiLink } from '@elastic/eui';

export function FormattedAlert({ prefix, suffix, message, metadata, changeUrl }) {
  const formattedAlert = (() => {
    if (metadata && metadata.link) {
      if (metadata.link.startsWith('https')) {
        return (
          <EuiLink href={metadata.link} target="_blank" data-test-subj="alertAction">
            {message}
          </EuiLink>
        );
      }

      const goToLink = () => changeUrl(`/${metadata.link}`);

      return (
        <EuiLink onClick={goToLink} data-test-subj="alertAction">
          {message}
        </EuiLink>
      );
    }

    return message;
  })();

  if (metadata && metadata.time) {
    // scan message prefix and replace relative times
    // \w: Matches any alphanumeric character from the basic Latin alphabet, including the underscore. Equivalent to [A-Za-z0-9_].
    prefix = prefix.replace(
      /{{#relativeTime}}metadata\.([\w\.]+){{\/relativeTime}}/,
      (_match, field) => {
        return formatTimestampToDuration(metadata[field], CALCULATE_DURATION_UNTIL);
      }
    );
    prefix = prefix.replace(
      /{{#absoluteTime}}metadata\.([\w\.]+){{\/absoluteTime}}/,
      (_match, field) => {
        return moment.tz(metadata[field], moment.tz.guess()).format('LLL z');
      }
    );
  }

  // suffix and prefix don't contain spaces
  const formattedPrefix = prefix ? `${prefix} ` : null;
  const formattedSuffix = suffix ? ` ${suffix}` : null;
  return (
    <span data-test-subj="alertText">
      {formattedPrefix}
      {formattedAlert}
      {formattedSuffix}
    </span>
  );
}
