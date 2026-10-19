/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export const messageWithNowrapDate = (message: string, date: string | null): React.ReactNode => {
  if (!date) {
    return message;
  }

  const dateStart = message.indexOf(date);
  if (dateStart === -1) {
    return message;
  }

  return (
    <>
      {message.slice(0, dateStart)}
      <span css={{ whiteSpace: 'nowrap' }}>{date}</span>
      {message.slice(dateStart + date.length)}
    </>
  );
};
