/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import * as i18n from '../translations';

interface InboxWatchesNavProps {
  active: 'inbox' | 'watches' | 'investigations';
}

export const InboxWatchesNav: React.FC<InboxWatchesNavProps> = ({ active }) => {
  const history = useHistory();

  return (
    <EuiButtonGroup
      legend={i18n.PAGE_TITLE}
      idSelected={active}
      onChange={(id) => {
        if (id === 'inbox') history.push('/');
        else if (id === 'watches') history.push('/watches');
        else history.push('/investigations');
      }}
      options={[
        { id: 'inbox', label: i18n.NAV_INBOX },
        { id: 'watches', label: i18n.NAV_WATCHES },
        { id: 'investigations', label: 'Investigations' },
      ]}
      buttonSize="compressed"
      color="text"
    />
  );
};
