/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { set, get } from 'lodash';
import { fromExpression, toExpression } from '@kbn/interpreter/common';
import { notifyService } from '../../services';
import { getAssets } from '../../state/selectors/assets';
// @ts-ignore Untyped local
import { removeAsset, createAsset } from '../../state/actions/assets';
// @ts-ignore Untyped local
import { elementsRegistry } from '../../lib/elements_registry';
// @ts-ignore Untyped local
import { addElement } from '../../state/actions/elements';
import { getSelectedPage } from '../../state/selectors/workpad';
import { encode } from '../../../common/lib/dataurl';
import { getId } from '../../lib/get_id';
// @ts-ignore Untyped Local
import { findExistingAsset } from '../../lib/find_existing_asset';
import { VALID_IMAGE_TYPES } from '../../../common/lib/constants';
import { AssetManager as Component } from './asset_manager';

import { State, ExpressionAstExpression } from '../../../types';

const mapStateToProps = (state: State) => ({
  assets: getAssets(state),
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = dispatch => ({
  onAddImageElement: (pageId: string) => (assetId: string) => {
    const imageElement = elementsRegistry.get('image');
    const elementAST = fromExpression(imageElement.expression);
    const selector = ['chain', '0', 'arguments', 'dataurl'];
    const subExp: ExpressionAstExpression = [
      {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'asset',
            arguments: {
              _: [assetId],
            },
          },
        ],
      },
    ];
    const newAST = set<ExpressionAstExpression>(elementAST, selector, subExp);
    imageElement.expression = toExpression(newAST);
    dispatch(addElement(pageId, imageElement));
  },
  onAssetAdd: (type: string, content: string) => {
    // make the ID here and pass it into the action
    const assetId = getId('asset');
    dispatch(createAsset(type, content, assetId));

    // then return the id, so the caller knows the id that will be created
    return assetId;
  },
  onAssetDelete: (assetId: string) => dispatch(removeAsset(assetId)),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { assets, selectedPage } = stateProps;
  const { onAssetAdd } = dispatchProps;
  const assetValues = Object.values(assets); // pull values out of assets object

  return {
    ...ownProps,
    ...dispatchProps,
    onAddImageElement: dispatchProps.onAddImageElement(stateProps.selectedPage),
    selectedPage,
    assetValues,
    onAssetAdd: file => {
      const [type, subtype] = get(file, 'type', '').split('/');
      if (type === 'image' && VALID_IMAGE_TYPES.indexOf(subtype) >= 0) {
        return encode(file).then(dataurl => {
          const type = 'dataurl';
          const existingId = findExistingAsset(type, dataurl, assetValues);
          if (existingId) {
            return existingId;
          }
          return onAssetAdd(type, dataurl);
        });
      }

      return false;
    },
  };
};

export const AssetManager = compose(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withProps({
    onAssetCopy: asset => notifyService.getService().success(`Copied '${asset.id}' to clipboard`),
  })
)(Component);
