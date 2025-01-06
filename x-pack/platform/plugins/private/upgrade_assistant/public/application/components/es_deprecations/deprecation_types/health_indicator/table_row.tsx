/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EuiTableRowCell } from '@elastic/eui';
import { GlobalFlyout } from '../../../../../shared_imports';
import { EnrichedDeprecationInfo } from '../../../../../../common/types';
import { DeprecationTableColumns } from '../../../types';
import { EsDeprecationsTableCells } from '../../es_deprecations_table_cells';
import { HealthIndicatorFlyout, HealthIndicatorFlyoutProps } from './flyout';

const { useGlobalFlyout } = GlobalFlyout;

interface Props {
  rowFieldNames: DeprecationTableColumns[];
  deprecation: EnrichedDeprecationInfo;
}

export const HealthIndicatorTableRow: React.FunctionComponent<Props> = ({
  rowFieldNames,
  deprecation,
}) => {
  const [showFlyout, setShowFlyout] = useState(false);

  const { addContent: addContentToGlobalFlyout, removeContent: removeContentFromGlobalFlyout } =
    useGlobalFlyout();

  const closeFlyout = useCallback(() => {
    setShowFlyout(false);
    removeContentFromGlobalFlyout('deprecationDetails');
  }, [removeContentFromGlobalFlyout]);

  useEffect(() => {
    if (showFlyout) {
      addContentToGlobalFlyout<HealthIndicatorFlyoutProps>({
        id: 'deprecationDetails',
        Component: HealthIndicatorFlyout,
        props: {
          deprecation,
          closeFlyout,
        },
        flyoutProps: {
          onClose: closeFlyout,
          className: 'eui-textBreakWord',
          'data-test-subj': 'healthIndicatorDetails',
          'aria-labelledby': 'healthIndicatorDetailsFlyoutTitle',
        },
      });
    }
  }, [addContentToGlobalFlyout, closeFlyout, deprecation, showFlyout]);

  return (
    <>
      {rowFieldNames.map((field) => {
        return (
          <EuiTableRowCell
            key={field}
            truncateText={false}
            data-test-subj={`healthIndicatorTableCell-${field}`}
          >
            <EsDeprecationsTableCells
              fieldName={field}
              deprecation={deprecation}
              openFlyout={() => setShowFlyout(true)}
            />
          </EuiTableRowCell>
        );
      })}
    </>
  );
};
