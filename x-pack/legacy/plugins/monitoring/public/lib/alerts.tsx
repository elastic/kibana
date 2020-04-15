/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable */
/* tslint-disable */
import React, { Fragment } from 'react';
import moment from 'moment-timezone';
import { EuiLink } from '@elastic/eui';
import {
  AlertUiState,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
} from '../../../../../plugins/monitoring/server/alerts/enums';
import { AlertMessageTokenType } from '../../../../../plugins/monitoring/server/alerts/enums';
import { CALCULATE_DURATION_UNTIL } from '../../../../../plugins/monitoring/common/constants';
// @ts-ignore
import { formatTimestampToDuration } from '../../common/format_timestamp_to_duration';

export function replaceTokens(alert: AlertUiState): any {
  if (!alert.message) {
    return null;
  }

  if (!alert.message.tokens) {
    return alert.message.text;
  }

  let text = alert.message.text;

  for (const token of alert.message.tokens) {
    if (token.type === AlertMessageTokenType.Time) {
      const timeToken = token as AlertMessageTimeToken;
      // alert.expirationTime will not work here!!!!
      text = text.replace(
        token.startToken,
        timeToken.isRelative
          ? formatTimestampToDuration((timeToken.timestamp, CALCULATE_DURATION_UNTIL))
          : moment.tz(timeToken.timestamp, moment.tz.guess()).format('LLL z')
      );
    } else if (token.type === AlertMessageTokenType.Link) {
      const linkToken = token as AlertMessageLinkToken;
      const linkPart = new RegExp(`${linkToken.startToken}(.+?)${linkToken.endToken}`).exec(text);
      if (!linkPart || linkPart.length === 0) {
        return null;
      }
      // TODO: we assume this is at the end, which works for now but will not always work
      const nonLinkText = text.replace(linkPart[0], '');
      text = (
        <Fragment>
          {nonLinkText}
          &nbsp;
          <EuiLink href={`#${token.url}`}>{linkPart[1]}</EuiLink>
        </Fragment>
      );
    }
  }

  return text;
}
