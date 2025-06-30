/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { formatMatchFailure } from '../format_match_failure';
import { findDissectMatchFailure } from './find_dissect_match_failure';
describe('findDissectMatchFailure', () => {
  it.skip.each([
    {
      pattern:
        '- %{unix_timestamp} %{date} %{hostname} %{date_time} %{user_host} %{process}[%{pid}]: %{message_details}',
      message:
        '- 1748247027 2005.11.09 cn709 Nov 9 12:04:07 cn709/cn709 ntpd[19295]: synchronized to 10.100.16.250, stratum 3',
    },
    {
      pattern:
        '`- %{unix_timestamp} %{date} %{hostname} %{date_time} %{source} %{process}[%{pid}]: %{message_details}',
      message:
        '- 1748248773 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root',
      error:
        'Could not match pattern. Expected "- 1748248773 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root" to match "`- %{unix_timestamp} %{date} %{hostname} %{date_time} %{source} %{process}[%{pid}]: %{message_details}".',
    },
    {
      pattern: `- %{unix_timestamp} %{date} %{hostname} %{log_date} %{log_time} %{user}@%{hostname} %{process}[%{pid}]: %{message_details}`,
      message: `- 1748248773 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root`,
      error:
        'Could not match pattern. Expected "12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root" to match "@%{hostname} %{process}[%{pid}]: %{message_details}". Matched "- 1748248773 2005.11.09 en74 Nov 9 " against "- %{unix_timestamp} %{date} %{hostname} %{log_date} %{log_time} %{user}"',
    },
    {
      pattern: `- %{unix_timestamp} %{date} %{hostname} %{syslog_date} %{syslog_host} %{process}[%{pid}]: %{message_details}`,
      message: `- 1748258938 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 ACPI: PCI Interrupt Routing Table [_SB_.PCI0.PICH._PRT]`,
      error:
        'Could not match pattern. Expected "_SB_.PCI0.PICH._PRT]" to match "]: %{message_details}". Matched "- 1748258938 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 ACPI: PCI Interrupt Routing Table [" against "- %{unix_timestamp} %{date} %{hostname} %{syslog_date} %{syslog_host} %{process}[%{pid}"',
    },
  ])('%s', ({ pattern, message, error }) => {
    const failure = findDissectMatchFailure(pattern, message);

    if (failure) {
      expect(formatMatchFailure(failure)).toEqual(error);
    } else {
      expect(error).not.toBeDefined();
    }
  });
});
