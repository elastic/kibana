/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore (elastic/eui#1262) EuiImage is not exported yet
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { Clipboard } from '../clipboard';
import { Download } from '../download';

type ValidTypes = 'dataurl';

export interface AssetType {
  '@created': string;
  id: string;
  type: ValidTypes;
  value: string;
}

interface Props {
  /** The asset to be rendered */
  asset: AssetType;
  /** The function to execute when the user clicks 'Create' */
  onCreate: (asset: AssetType) => void;
  /** The function to execute when the user clicks 'Copy' */
  onCopy: (asset: AssetType) => void;
  /** The function to execute when the user clicks 'Delete' */
  onDelete: (asset: AssetType) => void;
}

export const Asset: FunctionComponent<Props> = props => {
  const { asset, onCreate, onCopy, onDelete } = props;

  const createImage = (
    <EuiFlexItem className="asset-create-image" grow={false}>
      <EuiToolTip content="Create image element">
        <EuiButtonIcon
          iconType="vector"
          aria-label="Create image element"
          onClick={() => onCreate(asset)}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );

  const downloadAsset = (
    <EuiFlexItem className="asset-download" grow={false}>
      <EuiToolTip content="Download">
        <Download fileName={asset.id} content={asset.value}>
          <EuiButtonIcon iconType="sortDown" aria-label="Download" />
        </Download>
      </EuiToolTip>
    </EuiFlexItem>
  );

  const copyAsset = (
    <EuiFlexItem grow={false}>
      <EuiToolTip content="Copy id to clipboard">
        <Clipboard content={asset.id} onCopy={(result: boolean) => result && onCopy(asset)}>
          <EuiButtonIcon iconType="copyClipboard" aria-label="Copy id to clipboard" />
        </Clipboard>
      </EuiToolTip>
    </EuiFlexItem>
  );

  const deleteAsset = (
    <EuiFlexItem grow={false}>
      <EuiToolTip content="Delete">
        <EuiButtonIcon
          color="danger"
          iconType="trash"
          aria-label="Delete"
          onClick={() => onDelete(asset)}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );

  const thumbnail = (
    <div className="canvasAsset__thumb canvasCheckered">
      <EuiImage
        className="canvasAsset__img"
        size="original"
        url={props.asset.value}
        fullScreenIconColor="dark"
        alt="Asset thumbnail"
        style={{ backgroundImage: `url(${props.asset.value})` }}
      />
    </div>
  );

  const assetLabel = (
    <EuiText size="xs" className="eui-textBreakAll">
      <p className="eui-textBreakAll">
        <strong>{asset.id}</strong>
        <br />
        <EuiTextColor color="subdued">
          <small>({Math.round(asset.value.length / 1024)} kb)</small>
        </EuiTextColor>
      </p>
    </EuiText>
  );

  return (
    <EuiFlexItem key={props.asset.id}>
      <EuiPanel className="canvasAsset" paddingSize="s">
        {thumbnail}
        <EuiSpacer size="s" />
        {assetLabel}
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="baseline" justifyContent="center" responsive={false}>
          {createImage}
          {downloadAsset}
          {copyAsset}
          {deleteAsset}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
};
