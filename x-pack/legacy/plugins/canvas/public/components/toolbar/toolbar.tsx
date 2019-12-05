/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOverlayMask,
  EuiModal,
  EuiModalFooter,
  EuiButton,
} from '@elastic/eui';
import { CanvasElement } from '../../../types';

import { ComponentStrings } from '../../../i18n';

// @ts-ignore untyped local
import { Navbar } from '../navbar';
// @ts-ignore untyped local
import { WorkpadManager } from '../workpad_manager';
// @ts-ignore untyped local
import { PageManager } from '../page_manager';
// @ts-ignore untyped local
import { Expression } from '../expression';
import { Tray } from './tray';

const { Toolbar: strings } = ComponentStrings;

enum TrayType {
  pageManager = 'pageManager',
  expression = 'expression',
}

interface Props {
  workpadName: string;

  tray: TrayType | null;
  setTray: (tray: TrayType | null) => void;

  previousPage: () => void;
  nextPage: () => void;
  selectedPageNumber: number;
  totalPages: number;

  selectedElement: CanvasElement;

  showWorkpadManager: boolean;
  setShowWorkpadManager: (show: boolean) => void;
}

export const Toolbar = (props: Props) => {
  const {
    selectedElement,
    tray,
    setTray,
    previousPage,
    nextPage,
    selectedPageNumber,
    workpadName,
    totalPages,
    showWorkpadManager,
    setShowWorkpadManager,
  } = props;

  const elementIsSelected = Boolean(selectedElement);

  const done = () => setTray(null);

  const showHideTray = (exp: TrayType) => {
    if (tray && tray === exp) {
      return done();
    }
    setTray(exp);
  };

  const closeWorkpadManager = () => setShowWorkpadManager(false);
  const openWorkpadManager = () => setShowWorkpadManager(true);

  const workpadManager = (
    <EuiOverlayMask>
      <EuiModal onClose={closeWorkpadManager} className="canvasModal--fixedSize" maxWidth="1000px">
        <WorkpadManager onClose={closeWorkpadManager} />
        <EuiModalFooter>
          <EuiButton size="s" onClick={closeWorkpadManager}>
            {strings.getWorkpadManagerCloseButtonLabel()}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );

  const trays = {
    pageManager: <PageManager previousPage={previousPage} />,
    expression: !elementIsSelected ? null : <Expression key={selectedElement.id} done={done} />,
  };

  return (
    <div className="canvasToolbar hide-for-sharing">
      {tray !== null && <Tray done={done}>{trays[tray]}</Tray>}
      <Navbar>
        <EuiFlexGroup alignItems="center" gutterSize="none" className="canvasToolbar__controls">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty color="text" iconType="grid" onClick={() => openWorkpadManager()}>
              {workpadName}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false} />
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              color="text"
              onClick={previousPage}
              iconType="arrowLeft"
              disabled={selectedPageNumber <= 1}
              aria-label={strings.getPreviousPageAriaLabel()}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty color="text" onClick={() => showHideTray(TrayType.pageManager)}>
              {strings.getPageButtonLabel(selectedPageNumber, totalPages)}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              color="text"
              onClick={nextPage}
              iconType="arrowRight"
              disabled={selectedPageNumber >= totalPages}
              aria-label={strings.getNextPageAriaLabel()}
            />
          </EuiFlexItem>
          <EuiFlexItem />
          {elementIsSelected && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="text"
                iconType="editorCodeBlock"
                onClick={() => showHideTray(TrayType.expression)}
              >
                {strings.getEditorButtonLabel()}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </Navbar>

      {showWorkpadManager && workpadManager}
    </div>
  );
};

Toolbar.propTypes = {
  workpadName: PropTypes.string,
  tray: PropTypes.string,
  setTray: PropTypes.func.isRequired,
  nextPage: PropTypes.func.isRequired,
  previousPage: PropTypes.func.isRequired,
  selectedPageNumber: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  selectedElement: PropTypes.object,
  showWorkpadManager: PropTypes.bool.isRequired,
  setShowWorkpadManager: PropTypes.func.isRequired,
};
