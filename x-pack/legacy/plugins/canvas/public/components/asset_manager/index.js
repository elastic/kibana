/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { set, get } from 'lodash';
import { fromExpression, toExpression } from '@kbn/interpreter/common';
import { notify } from '../../lib/notify';
import { getAssets } from '../../state/selectors/assets';
import { removeAsset, createAsset } from '../../state/actions/assets';
import { elementsRegistry } from '../../lib/elements_registry';
import { addElement } from '../../state/actions/elements';
import { getSelectedPage } from '../../state/selectors/workpad';
import { encode } from '../../../common/lib/dataurl';
import { getId } from '../../lib/get_id';
import { findExistingAsset } from '../../lib/find_existing_asset';
import { VALID_IMAGE_TYPES } from '../../../common/lib/constants';
import { AssetManager as Component } from './asset_manager';

const mapStateToProps = state => ({
  assets: getAssets(state),
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = dispatch => ({
  onAddImageElement: pageId => assetId => {
    const imageElement = elementsRegistry.get('image');
    const elementAST = fromExpression(imageElement.expression);
    const selector = ['chain', '0', 'arguments', 'dataurl'];
    const subExp = [
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
    const newAST = set(elementAST, selector, subExp);
    imageElement.expression = toExpression(newAST);
    dispatch(addElement(pageId, imageElement));
  },
  onAssetAdd: (type, content) => {
    // make the ID here and pass it into the action
    const assetId = getId('asset');
    dispatch(createAsset(type, content, assetId));

    // then return the id, so the caller knows the id that will be created
    return assetId;
  },
  onAssetDelete: assetId => dispatch(removeAsset(assetId)),
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
  withProps({ onAssetCopy: asset => notify.success(`Copied '${asset.id}' to clipboard`) })
)(Component);
