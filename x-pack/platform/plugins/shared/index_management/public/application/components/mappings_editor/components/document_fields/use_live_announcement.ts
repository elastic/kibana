/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';

interface UseLiveAnnouncementOptions {
  message: string;
  changeKey: string;
  announceOnMount?: boolean;
}

export const useLiveAnnouncement = ({
  message,
  changeKey,
  announceOnMount = false,
}: UseLiveAnnouncementOptions): string => {
  const [announcement, setAnnouncement] = useState<string>(() => (announceOnMount ? message : ''));

  useUpdateEffect(() => {
    setAnnouncement((current) => {
      if (current === message) {
        requestAnimationFrame(() => setAnnouncement(message));
        return '';
      }
      return message;
    });
  }, [changeKey, message]);

  return announcement;
};
