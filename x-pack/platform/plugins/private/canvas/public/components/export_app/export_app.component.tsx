/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import PropTypes from 'prop-types';
import { css } from '@emotion/react';
// @ts-expect-error untyped local
import { WorkpadPage } from '../workpad_page';
import { RoutingLink } from '../routing';
import { CanvasWorkpad } from '../../../types';

export interface Props {
  workpad: CanvasWorkpad;
  selectedPageIndex: number;
  initializeWorkpad: () => void;
}

export const ExportApp: FC<Props> = ({ workpad, selectedPageIndex, initializeWorkpad }) => {
  const { id, pages, height, width } = workpad;
  const activePage = pages[selectedPageIndex];
  const pageElementCount = activePage.elements.length;

  useEffect(() => initializeWorkpad());

  return (
    <div className="canvasExport" data-shared-page={selectedPageIndex + 1}>
      <div className="canvasExport__stage">
        <div className="canvasLayout__stageHeader">
          <RoutingLink to={`/workpad/${id}`}>Edit Workpad</RoutingLink>
        </div>
        {
          <div
            css={css(workpad.css)}
            className="canvasExport__stageContent"
            data-shared-items-count={pageElementCount}
          >
            <WorkpadPage
              isSelected
              key={activePage.id}
              pageId={activePage.id}
              height={height}
              width={width}
              registerLayout={() => {}}
              unregisterLayout={() => {}}
            />
          </div>
        }
      </div>
    </div>
  );
};

ExportApp.propTypes = {
  workpad: PropTypes.shape({
    id: PropTypes.string.isRequired,
    pages: PropTypes.array.isRequired,
  }).isRequired,
  selectedPageIndex: PropTypes.number.isRequired,
  initializeWorkpad: PropTypes.func.isRequired,
};
