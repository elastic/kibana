/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useNotifyService } from '../../services';

import { ConfirmModal } from '../confirm_modal';
import { Clipboard } from '../clipboard';
import { Download } from '../download';
import { AssetType } from '../../../types';

const strings = {
  getCopyAssetTooltip: () =>
    i18n.translate('xpack.canvas.asset.copyAssetTooltip', {
      defaultMessage: 'Copy id to clipboard',
    }),
  getCreateImageTooltip: () =>
    i18n.translate('xpack.canvas.asset.createImageTooltip', {
      defaultMessage: 'Create image element',
    }),
  getDeleteAssetTooltip: () =>
    i18n.translate('xpack.canvas.asset.deleteAssetTooltip', {
      defaultMessage: 'Delete',
    }),
  getDownloadAssetTooltip: () =>
    i18n.translate('xpack.canvas.asset.downloadAssetTooltip', {
      defaultMessage: 'Download',
    }),
  getThumbnailAltText: () =>
    i18n.translate('xpack.canvas.asset.thumbnailAltText', {
      defaultMessage: 'Asset thumbnail',
    }),
  getConfirmModalButtonLabel: () =>
    i18n.translate('xpack.canvas.asset.confirmModalButtonLabel', {
      defaultMessage: 'Remove',
    }),
  getConfirmModalMessageText: () =>
    i18n.translate('xpack.canvas.asset.confirmModalDetail', {
      defaultMessage: 'Are you sure you want to remove this asset?',
    }),
  getConfirmModalTitle: () =>
    i18n.translate('xpack.canvas.asset.confirmModalTitle', {
      defaultMessage: 'Remove Asset',
    }),
};

export interface Props {
  /** The asset to be rendered */
  asset: AssetType;
  /** The function to execute when the user clicks 'Create' */
  onCreate: (assetId: string) => void;
  /** The function to execute when the user clicks 'Delete' */
  onDelete: (asset: AssetType) => void;
}

export const Asset: FC<Props> = ({ asset, onCreate, onDelete }) => {
  const { success } = useNotifyService();
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);

  const onCopy = (result: boolean) => result && success(`Copied '${asset.id}' to clipboard`);

  const confirmModal = (
    <ConfirmModal
      isOpen={isConfirmModalVisible}
      title={strings.getConfirmModalTitle()}
      message={strings.getConfirmModalMessageText()}
      confirmButtonText={strings.getConfirmModalButtonLabel()}
      onConfirm={() => {
        setIsConfirmModalVisible(false);
        onDelete(asset);
      }}
      onCancel={() => setIsConfirmModalVisible(false)}
    />
  );

  const createImage = (
    <EuiFlexItem className="asset-create-image" grow={false}>
      <EuiToolTip content={strings.getCreateImageTooltip()} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="vector"
          aria-label={strings.getCreateImageTooltip()}
          onClick={() => onCreate(asset.id)}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );

  const downloadAsset = (
    <EuiFlexItem className="asset-download" grow={false}>
      <EuiToolTip content={strings.getDownloadAssetTooltip()}>
        <Download fileName={asset.id} content={asset.value}>
          <EuiButtonIcon iconType="sortDown" aria-label={strings.getDownloadAssetTooltip()} />
        </Download>
      </EuiToolTip>
    </EuiFlexItem>
  );

  const copyAsset = (
    <EuiFlexItem grow={false}>
      <EuiToolTip content={strings.getCopyAssetTooltip()}>
        <Clipboard content={asset.id} onCopy={onCopy}>
          <EuiButtonIcon iconType="copyClipboard" aria-label={strings.getCopyAssetTooltip()} />
        </Clipboard>
      </EuiToolTip>
    </EuiFlexItem>
  );

  const deleteAsset = (
    <EuiFlexItem grow={false}>
      <EuiToolTip content={strings.getDeleteAssetTooltip()} disableScreenReaderOutput>
        <EuiButtonIcon
          color="danger"
          iconType="trash"
          aria-label={strings.getDeleteAssetTooltip()}
          onClick={() => setIsConfirmModalVisible(true)}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );

  const thumbnail = (
    <div className="canvasAsset__thumb canvasCheckered">
      <EuiImage
        className="canvasAsset__img"
        size="original"
        url={asset.value}
        fullScreenIconColor="dark"
        alt={strings.getThumbnailAltText()}
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
    <EuiFlexItem key={asset.id}>
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
      {isConfirmModalVisible ? confirmModal : null}
    </EuiFlexItem>
  );
};
