/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect, Fragment } from 'react';
import {
  EuiFlyout,
  EuiIcon,
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiFlyoutBody,
  EuiSelectable,
  EuiSpacer,
  EuiSwitch,
  EuiFormRow,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { kfetch } from 'ui/kfetch';
import { FormattedMessage } from '@kbn/i18n/react';
import { SavedObjectRecord } from 'ui/management/saved_objects_management';
import { SpaceAvatar } from '../../../../components';
import { Space } from '../../../../../common/model/space';

interface Props {
  onClose: () => void;
  object: SavedObjectRecord;
}

export const CopyToSpace = ({ onClose, object }: Props) => {
  const [includeRelated, setIncludeRelated] = useState(true);
  const [overwrite, setOverwrite] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [options, setOptions] = useState([] as any[]);

  const selectedOptions = options.filter(option => option.checked);
  useEffect(() => {
    kfetch({ pathname: '/api/spaces/space' }).then((spaces: Space[]) => {
      setOptions(
        spaces.map(space => ({
          label: space.name,
          prepend: <SpaceAvatar space={space} size={'s'} />,
        }))
      );
      setIsLoading(false);
    });
  }, []);

  return (
    <EuiFlyout onClose={onClose} maxWidth={400}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <EuiIcon size="m" type="spacesApp" />
            &nbsp; &nbsp;
            <FormattedMessage
              id="xpack.spaces.management.copyToSpaceFlyoutHeader"
              defaultMessage="Copy saved object to space"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <EuiIcon type={object.meta.icon || 'apps'} /> {object.meta.title}
        </EuiText>

        <EuiSpacer />

        <EuiSwitch
          label={
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.includeRelatedObjects"
              defaultMessage="Include related objects"
            />
          }
          checked={includeRelated}
          onChange={e => setIncludeRelated(e.target.checked)}
        />

        <EuiSpacer />

        <EuiSwitch
          label={
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.automaticallyOverwrite"
              defaultMessage="Automatically overwrite all saved objects"
            />
          }
          checked={overwrite}
          onChange={e => setOverwrite(e.target.checked)}
        />

        <EuiSpacer />

        {!isLoading && (
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.spaces.management.copyToSpace.selectSpacesLabel"
                defaultMessage="Select spaces to copy into"
              />
            }
          >
            <EuiSelectable
              options={options}
              onChange={newOptions => setOptions(newOptions)}
              height={200}
              isLoading={isLoading}
              listProps={{ bordered: true }}
              searchable
            >
              {(list, search) => {
                return (
                  <Fragment>
                    {search}
                    {list}
                  </Fragment>
                );
              }}
            </EuiSelectable>
          </EuiFormRow>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => null}
              data-test-subj="initiateCopyToSpacesButton"
              disabled={selectedOptions.length === 0}
            >
              {selectedOptions.length > 0 ? (
                <FormattedMessage
                  id="xpack.spaces.management.copyToSpace.copyToSpacesButton"
                  defaultMessage="Copy to {spaceCount} {spaceCount, plural, one {space} other {spaces}}"
                  values={{ spaceCount: options.filter(option => option.checked).length }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.spaces.management.copyToSpace.disabledCopyToSpacesButton"
                  defaultMessage="Copy"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
