/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useFormContext } from 'react-hook-form';
import { QUERY_TIMEOUT } from '../../../common/constants';
import { LiveQuery } from '../../live_queries';

const euiFlyoutHeaderCss = {
  '&.euiFlyoutHeader': {
    paddingTop: '21px',
    paddingBottom: '20px',
  },
};

interface PlaygroundFlyoutProps {
  enabled?: boolean;
  onClose: () => void;
}

const PlaygroundFlyoutComponent: React.FC<PlaygroundFlyoutProps> = ({ enabled, onClose }) => {
  // @ts-expect-error update types
  const { serializer, watch } = useFormContext();
  const watchedValues = watch();
  const { query, ecs_mapping: ecsMapping, id, timeout } = watchedValues;
  /* recalculate the form data when ecs_mapping changes */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const serializedFormData = useMemo(() => serializer(watchedValues), [ecsMapping]);

  return (
    <EuiFlyout type="push" size="m" onClose={onClose} data-test-subj={'osquery-save-query-flyout'}>
      <EuiFlyoutHeader css={euiFlyoutHeaderCss} hasBorder>
        <EuiTitle size="s">
          <h5>
            <FormattedMessage
              id="xpack.osquery.queryPlaygroundFlyout.title"
              defaultMessage="Test query"
            />
          </h5>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <LiveQuery
          enabled={enabled && query !== ''}
          formType="simple"
          query={query}
          ecs_mapping={serializedFormData.ecs_mapping}
          savedQueryId={id}
          timeout={timeout || QUERY_TIMEOUT.DEFAULT}
          queryField={false}
          ecsMappingField={false}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

export const PlaygroundFlyout = React.memo(PlaygroundFlyoutComponent);
