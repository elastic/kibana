/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiSwitch,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiCheckbox,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from '../../hooks/use_kibana';

export function StreamsSettingsFlyout({
  onClose,
  refreshStreams,
}: {
  onClose: () => void;
  refreshStreams: () => void;
}) {
  const { signal } = useAbortController();
  const context = useKibana();
  const {
    dependencies: {
      start: {
        streams: { wiredStatus$, enableWiredMode, disableWiredMode },
      },
    },
    core,
  } = context;

  const [wiredChecked, setWiredChecked] = React.useState<boolean | undefined>(undefined);
  const [loading, setLoading] = React.useState(true);
  const [showDisableModal, setShowDisableModal] = React.useState(false);
  const [disableConfirmChecked, setDisableConfirmChecked] = React.useState(false);
  const [isDisabling, setIsDisabling] = React.useState(false);

  React.useEffect(() => {
    const sub = wiredStatus$.subscribe(({ status }) => {
      setWiredChecked(status === 'enabled');
      setLoading(false);
    });
    return () => sub.unsubscribe();
  }, [wiredStatus$]);

  const handleSwitchChange = async () => {
    if (wiredChecked) {
      setShowDisableModal(true);
    } else {
      try {
        setLoading(true);
        await enableWiredMode(signal);
        refreshStreams();
      } catch (error) {
        core.notifications.toasts.addError(error, {
          title: i18n.translate('xpack.streams.streamsListView.enableWiredStreamsErrorToastTitle', {
            defaultMessage: 'Error updating wired streams setting',
          }),
          toastMessage:
            error?.body?.message || (error instanceof Error ? error.message : String(error)),
          toastLifeTimeMs: 5000,
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDisableConfirm = async () => {
    setIsDisabling(true);
    try {
      await disableWiredMode(signal);
      refreshStreams();
      setShowDisableModal(false);
      setDisableConfirmChecked(false);
    } catch (error) {
      core.notifications.toasts.addError(error, {
        title: i18n.translate('xpack.streams.streamsListView.enableWiredStreamsErrorToastTitle', {
          defaultMessage: 'Error updating wired streams setting',
        }),
        toastMessage:
          error?.body?.message || (error instanceof Error ? error.message : String(error)),
        toastLifeTimeMs: 5000,
      });
    } finally {
      setIsDisabling(false);
      setLoading(false);
    }
  };

  return (
    <>
      <EuiFlyout onClose={onClose} size="s" aria-labelledby="streamsSettingsFlyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="streamsSettingsFlyoutTitle">
              {i18n.translate('xpack.streams.streamsListView.settingsFlyoutTitle', {
                defaultMessage: 'Streams Settings',
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {loading ? (
            <EuiLoadingSpinner size="l" />
          ) : (
            <EuiSwitch
              label={i18n.translate('xpack.streams.streamsListView.enableWiredStreamsSwitchLabel', {
                defaultMessage: 'Enable wired streams',
              })}
              checked={Boolean(wiredChecked)}
              onChange={handleSwitchChange}
              data-test-subj="streamsWiredSwitch"
            />
          )}
        </EuiFlyoutBody>
      </EuiFlyout>
      {showDisableModal && (
        <EuiModal
          onClose={() => {
            setShowDisableModal(false);
            setDisableConfirmChecked(false);
          }}
          aria-labelledby="streamsWiredDisableModalTitle"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id="streamsWiredDisableModalTitle">
              {i18n.translate('xpack.streams.streamsSettingsFlyout.disableModalTitle', {
                defaultMessage: 'Disable Wired Streams?',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            {i18n.translate('xpack.streams.streamsSettingsFlyout.disableModalDescription', {
              defaultMessage:
                'Disabling Wired Streams will permanently delete all stored data and configuration. This action cannot be undone.',
            })}
            <EuiSpacer size="m" />
            <EuiCheckbox
              id="wiredDisableConfirm"
              checked={disableConfirmChecked}
              onChange={(e) => setDisableConfirmChecked(e.target.checked)}
              label={i18n.translate('xpack.streams.streamsSettingsFlyout.disableModalCheckbox', {
                defaultMessage: 'I understand this will delete all data and configuration.',
              })}
            />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              onClick={() => {
                setShowDisableModal(false);
                setDisableConfirmChecked(false);
              }}
              disabled={isDisabling}
            >
              {i18n.translate('xpack.streams.streamsSettingsFlyout.disableModalCancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
            <EuiButton
              color="danger"
              fill
              isLoading={isDisabling}
              disabled={!disableConfirmChecked}
              onClick={handleDisableConfirm}
              data-test-subj="streamsWiredDisableConfirmButton"
            >
              {i18n.translate('xpack.streams.streamsSettingsFlyout.disableModalDisableButton', {
                defaultMessage: 'Disable Wired Streams',
              })}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
}
