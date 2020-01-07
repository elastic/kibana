/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiIcon,
  EuiToolTip,
  EuiAvatar,
} from '@elastic/eui';
import { NewTimeline, Description, NotesButton } from './helpers';
import { OpenTimelineModalButton } from '../../open_timeline/open_timeline_modal/open_timeline_modal_button';
import { OpenTimelineModal } from '../../open_timeline/open_timeline_modal';
import { InspectButton } from '../../inspect';

import * as i18n from './translations';
import { AssociateNote } from '../../notes/helpers';
import { Note } from '../../../lib/note';

export const PropertiesRightStyle = styled(EuiFlexGroup)`
  margin-right: 5px;
`;

PropertiesRightStyle.displayName = 'PropertiesRightStyle';

const DescriptionPopoverMenuContainer = styled.div`
  margin-top: 15px;
`;

DescriptionPopoverMenuContainer.displayName = 'DescriptionPopoverMenuContainer';

const SettingsIcon = styled(EuiIcon)`
  margin-left: 4px;
  cursor: pointer;
`;

SettingsIcon.displayName = 'SettingsIcon';

const HiddenFlexItem = styled(EuiFlexItem)`
  display: none;
`;

HiddenFlexItem.displayName = 'HiddenFlexItem';

const Avatar = styled(EuiAvatar)`
  margin-left: 5px;
`;

Avatar.displayName = 'Avatar';

type CreateTimeline = ({ id, show }: { id: string; show?: boolean }) => void;
type UpdateDescription = ({ id, description }: { id: string; description: string }) => void;
export type UpdateNote = (note: Note) => void;

interface Props {
  onButtonClick: () => void;
  onClosePopover: () => void;
  showActions: boolean;
  createTimeline: CreateTimeline;
  timelineId: string;
  isDataInTimeline: boolean;
  showNotes: boolean;
  showNotesFromWidth: boolean;
  showDescription: boolean;
  showUsersView: boolean;
  usersViewing: string[];
  description: string;
  updateDescription: UpdateDescription;
  associateNote: AssociateNote;
  getNotesByIds: (noteIds: string[]) => Note[];
  noteIds: string[];
  onToggleShowNotes: () => void;
  onCloseTimelineModal: () => void;
  onOpenTimelineModal: () => void;
  showTimelineModal: boolean;
  updateNote: UpdateNote;
}

export const PropertiesRight = React.memo<Props>(
  ({
    onButtonClick,
    showActions,
    onClosePopover,
    createTimeline,
    timelineId,
    isDataInTimeline,
    showNotesFromWidth,
    showNotes,
    showDescription,
    showUsersView,
    usersViewing,
    description,
    updateDescription,
    associateNote,
    getNotesByIds,
    noteIds,
    onToggleShowNotes,
    updateNote,
    showTimelineModal,
    onCloseTimelineModal,
    onOpenTimelineModal,
  }) => (
    <PropertiesRightStyle alignItems="flexStart" data-test-subj="properties-right" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiPopover
          anchorPosition="downRight"
          button={
            <SettingsIcon
              data-test-subj="settings-gear"
              size="l"
              type="gear"
              onClick={onButtonClick}
            />
          }
          closePopover={onClosePopover}
          id="timelineSettingsPopover"
          isOpen={showActions}
        >
          <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <NewTimeline
                createTimeline={createTimeline}
                timelineId={timelineId}
                onClosePopover={onClosePopover}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <OpenTimelineModalButton onClick={onOpenTimelineModal} />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <InspectButton
                inputId="timeline"
                inspectIndex={0}
                isDisabled={!isDataInTimeline}
                queryId={timelineId}
                show={true}
                title={i18n.INSPECT_TIMELINE_TITLE}
                onCloseInspect={onClosePopover}
              />
            </EuiFlexItem>

            {showNotesFromWidth ? (
              <EuiFlexItem grow={false}>
                <NotesButton
                  animate={true}
                  associateNote={associateNote}
                  getNotesByIds={getNotesByIds}
                  noteIds={noteIds}
                  showNotes={showNotes}
                  size="l"
                  text={i18n.NOTES}
                  toggleShowNotes={onToggleShowNotes}
                  toolTip={i18n.NOTES_TOOL_TIP}
                  updateNote={updateNote}
                />
              </EuiFlexItem>
            ) : null}

            {showDescription ? (
              <EuiFlexItem grow={false}>
                <DescriptionPopoverMenuContainer>
                  <Description
                    description={description}
                    timelineId={timelineId}
                    updateDescription={updateDescription}
                  />
                </DescriptionPopoverMenuContainer>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiPopover>
      </EuiFlexItem>

      {showUsersView
        ? usersViewing.map(user => (
            // Hide the hard-coded elastic user avatar as the 7.2 release does not implement
            // support for multi-user-collaboration as proposed in elastic/ingest-dev#395
            <HiddenFlexItem key={user}>
              <EuiToolTip
                content={`${user} ${i18n.IS_VIEWING}`}
                data-test-subj="timeline-action-pin-tool-tip"
              >
                <Avatar data-test-subj="avatar" name={user} size="s" />
              </EuiToolTip>
            </HiddenFlexItem>
          ))
        : null}

      {showTimelineModal ? <OpenTimelineModal onClose={onCloseTimelineModal} /> : null}
    </PropertiesRightStyle>
  )
);

PropertiesRight.displayName = 'PropertiesRight';
