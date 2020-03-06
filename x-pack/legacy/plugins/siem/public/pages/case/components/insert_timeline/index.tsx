/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';

import { SearchTimelinePopover } from '../../../../components/timeline/search_super_select_insert';

export interface FieldValueTimeline {
  id: string | null;
  title: string | null;
}

interface QueryBarDefineRuleProps {
  dataTestSubj: string;
  idAria: string;
  isDisabled: boolean;
}

export const InsertTimeline = ({
  dataTestSubj,
  idAria,
  isDisabled = false,
}: QueryBarDefineRuleProps) => {
  const [timelineId, setTimelineId] = useState<string | null>(null);
  const [timelineTitle, setTimelineTitle] = useState<string | null>(null);

  const handleOnTimelineChange = useCallback((title: string, id: string | null) => {
    console.log('title', title);
    console.log('id', id);
    if (id != null) {
      setTimelineId(id);
    }
    setTimelineTitle(title);
  }, []);

  return (
    <SearchTimelinePopover
      isDisabled={isDisabled}
      hideUntitled={true}
      timelineId={timelineId}
      timelineTitle={timelineTitle}
      onTimelineChange={handleOnTimelineChange}
    />
  );
};
