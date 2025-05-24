import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/css';
import { FlyoutContainer } from '../../shared_components/flyout_container';
import type { ExtraAppendLayerArg } from './visualization';

const styles = {
  flyoutBody: css`
    padding: ${euiThemeVars.euiSize};
    height: 100%;
  `,
};

export function LoadAnnotationLibraryFlyout({
  eventAnnotationService,
  isLoadLibraryVisible,
  setLoadLibraryFlyoutVisible,
  addLayer,
  isInlineEditing,
}: {
  isLoadLibraryVisible: boolean;
  setLoadLibraryFlyoutVisible: (visible: boolean) => void;
  eventAnnotationService: EventAnnotationServiceType;
  addLayer: (argument?: ExtraAppendLayerArg) => void;
  isInlineEditing?: boolean;
}) {
  const {
    renderEventAnnotationGroupSavedObjectFinder: EventAnnotationGroupSavedObjectFinder,
    loadAnnotationGroup,
  } = eventAnnotationService || {};

  return (
    <FlyoutContainer
      customFooter={
        <EuiFlyoutFooter className="lnsDimensionContainer__footer">
          <EuiFlexGroup
            responsive={false}
            gutterSize="s"
            alignItems="center"
            justifyContent="spaceBetween"
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                flush="left"
                size="s"
                iconType="cross"
                onClick={() => {
                  setLoadLibraryFlyoutVisible(false);
                }}
                data-test-subj="lns-indexPattern-loadLibraryCancel"
              >
                {i18n.translate('xpack.lens.loadAnnotationsLibrary.cancel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      }
      isOpen={Boolean(isLoadLibraryVisible)}
      label={i18n.translate('xpack.lens.editorFrame.loadFromLibrary', {
        defaultMessage: 'Select annotations from library',
      })}
      handleClose={() => {
        setLoadLibraryFlyoutVisible(false);
      }}
      isInlineEditing={isInlineEditing}
    >
      <div className={styles.flyoutBody}>
        <EventAnnotationGroupSavedObjectFinder
          onChoose={({ id }) => {
            loadAnnotationGroup(id).then((loadedGroup) => {
              addLayer({ ...loadedGroup, annotationGroupId: id });
              setLoadLibraryFlyoutVisible(false);
            });
          }}
          onCreateNew={() => {
            addLayer();
            setLoadLibraryFlyoutVisible(false);
          }}
        />
      </div>
    </FlyoutContainer>
  );
}
