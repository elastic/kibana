/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { NEW_EXPERIENCE_CALLOUT_DISMISSED_KEY } from './constants';

export function NewExperienceCallout({ mapHref }: { mapHref: string }) {
  const [isDismissed, setIsDismissed] = useLocalStorage(
    NEW_EXPERIENCE_CALLOUT_DISMISSED_KEY,
    false
  );

  if (isDismissed) {
    return null;
  }

  return (
    <>
      <KbnInfoCallout
        size="s"
        title={i18n.translate('xpack.streams.newExperienceCallout.title', {
          defaultMessage: 'New Streams experience',
        })}
        text={i18n.translate('xpack.streams.newExperienceCallout.text', {
          defaultMessage:
            'Everything that was on the Streams list is still here, and nothing changed about your data, retention or queries. Map, Sources and Destinations show how your data flows from source to destination.',
        })}
        actionProps={{
          primary: {
            children: i18n.translate('xpack.streams.newExperienceCallout.openMapButton', {
              defaultMessage: 'Try the new experience',
            }),
            href: mapHref,
            'data-test-subj': 'streamsNewExperienceCalloutOpenMap',
          },
        }}
        onDismiss={() => setIsDismissed(true)}
        data-test-subj="streamsNewExperienceCallout"
      />
      <EuiSpacer size="m" />
    </>
  );
}
