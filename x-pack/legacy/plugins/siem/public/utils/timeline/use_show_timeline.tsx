/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useLocation } from 'react-router-dom';

import { useState, useEffect } from 'react';
import { SiemPageName } from '../../pages/home/types';

const hideTimelineForRoutes = [`/${SiemPageName.case}/configure`];

export const useShowTimeline = () => {
  const currentLocation = useLocation();
  const [showTimeline, setShowTimeline] = useState(
    !hideTimelineForRoutes.includes(currentLocation.pathname)
  );

  useEffect(() => {
    if (hideTimelineForRoutes.includes(currentLocation.pathname)) {
      if (showTimeline) {
        setShowTimeline(false);
      }
    } else if (!showTimeline) {
      setShowTimeline(true);
    }
  }, [currentLocation.pathname]);

  return [showTimeline];
};
