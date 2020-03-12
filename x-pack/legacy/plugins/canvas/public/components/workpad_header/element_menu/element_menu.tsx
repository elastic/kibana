/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import React, { Fragment, FunctionComponent, useState } from 'react';
import PropTypes from 'prop-types';
import {
  EuiButton,
  EuiContextMenu,
  EuiIcon,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { CONTEXT_MENU_TOP_BORDER_CLASSNAME } from '../../../../common/lib';
import { ElementSpec } from '../../../../types';
import { flattenPanelTree } from '../../../lib/flatten_panel_tree';
import { ComponentStrings } from '../../../../i18n/components';
import { AddEmbeddablePanel } from '../../embeddable_flyout';
import { Popover, ClosePopoverFn } from '../../popover';
// @ts-ignore Untyped local
import { AssetManager } from '../../asset_manager';
// @ts-ignore Untyped local
import { ElementTypes } from '../../element_types';

const { WorkpadHeaderElementMenu: strings } = ComponentStrings;

interface CategorizedElementLists {
  textElement: ElementSpec;
  shapeElement: ElementSpec;
  chartElements: ElementSpec[];
  imageElements: ElementSpec[];
  filterElements: ElementSpec[];
  progressElements: ElementSpec[];
  otherElements: ElementSpec[];
}

const categorizeElements = (elements: ElementSpec[]): CategorizedElementLists => {
  const categories: CategorizedElementLists = {
    textElement: {} as ElementSpec,
    shapeElement: {} as ElementSpec,
    chartElements: [],
    imageElements: [],
    filterElements: [],
    progressElements: [],
    otherElements: [],
  };

  elements = sortBy(elements, 'displayName');

  elements.forEach((element: ElementSpec) => {
    const type = element.type;
    switch (type) {
      case 'text':
        categories.textElement = element;
        break;
      case 'shape':
        categories.shapeElement = element;
        break;
      case 'chart':
        categories.chartElements.push(element);
        break;
      case 'image':
        categories.imageElements.push(element);
        break;
      case 'progress':
        categories.progressElements.push(element);
        break;
      case 'filter':
        categories.filterElements.push(element);
        break;
      case 'other':
      default:
        categories.otherElements.push(element);
    }
  });

  return categories;
};

export interface Props {
  elements: { [key: string]: ElementSpec };
  addElement: (element: ElementSpec) => void;
}

export const ElementMenu: FunctionComponent<Props> = ({ elements, addElement }) => {
  const [isAssetModalVisible, setAssetModalVisible] = useState(false);
  const [isEmbedPanelVisible, setEmbedPanelVisible] = useState(false);
  const [isSavedElementsModalVisible, setSavedElementsModalVisible] = useState(false);

  const hideAssetModal = () => setAssetModalVisible(false);
  const showAssetModal = () => setAssetModalVisible(true);
  const hideEmbeddablePanel = () => setEmbedPanelVisible(false);
  const showEmbeddablePanel = () => setEmbedPanelVisible(true);
  const hideSavedElementsModal = () => setSavedElementsModalVisible(false);
  const showSavedElementsModal = () => setSavedElementsModalVisible(true);

  const {
    textElement,
    shapeElement,
    chartElements,
    imageElements,
    filterElements,
    progressElements,
    otherElements,
  } = categorizeElements(Object.values(elements));

  const elementToMenuItem = (element: ElementSpec): EuiContextMenuPanelItemDescriptor => ({
    name: element.displayName || element.name,
    icon: element.icon,
    onClick: () => addElement(element),
  });

  const getPanelTree = (closePopover: ClosePopoverFn) => ({
    id: 0,
    title: strings.getElementMenuLabel(),
    items: [
      {
        name: textElement.displayName || textElement.name,
        icon: <EuiIcon type={textElement.icon} size="m" />,
        onClick: () => {
          addElement(textElement);
          closePopover();
        },
      },
      {
        name: shapeElement.displayName || shapeElement.name,
        icon: <EuiIcon type={shapeElement.icon} size="m" />,
        onClick: () => {
          addElement(shapeElement);
          closePopover();
        },
      },
      {
        name: strings.getChartMenuItemLabel(),
        icon: <EuiIcon type="visArea" size="m" />,
        panel: {
          id: 1,
          title: strings.getChartMenuItemLabel(),
          items: chartElements.map(elementToMenuItem),
        },
      },
      {
        name: strings.getImageMenuItemLabel(),
        icon: <EuiIcon type="image" size="m" />,
        panel: {
          id: 2,
          title: strings.getImageMenuItemLabel(),
          items: imageElements.map(elementToMenuItem),
        },
      },
      {
        name: strings.getFilterMenuItemLabel(),
        icon: <EuiIcon type="filter" size="m" />,
        panel: {
          id: 3,
          title: strings.getFilterMenuItemLabel(),
          items: filterElements.map(elementToMenuItem),
        },
      },
      {
        name: strings.getProgressMenuItemLabel(),
        icon: <EuiIcon type="visGoal" size="m" />,
        panel: {
          id: 4,
          title: strings.getProgressMenuItemLabel(),
          items: progressElements.map(elementToMenuItem),
        },
      },
      {
        name: strings.getOtherMenuItemLabel(),
        icon: <EuiIcon type="empty" size="m" />,
        panel: {
          id: 5,
          title: strings.getOtherMenuItemLabel(),
          items: otherElements.map(elementToMenuItem),
        },
      },
      {
        name: strings.getMyElementsMenuItemLabel(),
        className: CONTEXT_MENU_TOP_BORDER_CLASSNAME,
        icon: <EuiIcon type="empty" size="m" />,
        onClick: () => {
          showSavedElementsModal();
          closePopover();
        },
      },
      {
        name: strings.getAssetsMenuItemLabel(),
        icon: <EuiIcon type="empty" size="m" />,
        onClick: () => {
          showAssetModal();
          closePopover();
        },
      },
      {
        name: strings.getEmbedObjectMenuItemLabel(),
        className: CONTEXT_MENU_TOP_BORDER_CLASSNAME,
        icon: <EuiIcon type="logoKibana" size="m" />,
        onClick: () => {
          showEmbeddablePanel();
          closePopover();
        },
      },
    ],
  });

  const exportControl = (togglePopover: React.MouseEventHandler<any>) => (
    <EuiButton
      fill
      iconType="plusInCircle"
      size="s"
      aria-label={strings.getElementMenuLabel()}
      onClick={togglePopover}
    >
      {strings.getElementMenuButtonLabel()}
    </EuiButton>
  );

  return (
    <Fragment>
      <Popover
        button={exportControl}
        panelPaddingSize="none"
        tooltip={strings.getElementMenuLabel()}
        tooltipPosition="bottom"
      >
        {({ closePopover }: { closePopover: ClosePopoverFn }) => (
          <EuiContextMenu
            initialPanelId={0}
            panels={flattenPanelTree(getPanelTree(closePopover))}
          />
        )}
      </Popover>
      {isAssetModalVisible ? <AssetManager onClose={hideAssetModal} /> : null}
      {isEmbedPanelVisible ? <AddEmbeddablePanel onClose={hideEmbeddablePanel} /> : null}
      {isSavedElementsModalVisible ? <ElementTypes onClose={hideSavedElementsModal} /> : null}
    </Fragment>
  );
};

ElementMenu.propTypes = {
  elements: PropTypes.object,
};
