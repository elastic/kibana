/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAvatar, EuiFlexItem, EuiIcon } from '@elastic/eui';
import * as React from 'react';
import styled, { injectGlobal } from 'styled-components';

import { Note } from '../../../lib/note';
import { InputsModelId } from '../../../store/inputs/constants';
import { AssociateNote, UpdateNote } from '../../notes/helpers';

import { TimelineProperties } from './styles';
import { PropertiesRight } from './properties_right';
import { PropertiesLeft } from './properties_left';

type CreateTimeline = ({ id, show }: { id: string; show?: boolean }) => void;
type UpdateIsFavorite = ({ id, isFavorite }: { id: string; isFavorite: boolean }) => void;
type UpdateTitle = ({ id, title }: { id: string; title: string }) => void;
type UpdateDescription = ({ id, description }: { id: string; description: string }) => void;
type ToggleLock = ({ linkToId }: { linkToId: InputsModelId }) => void;

// SIDE EFFECT: the following `injectGlobal` overrides `EuiPopover`
// and `EuiToolTip` global styles:
// eslint-disable-next-line no-unused-expressions
injectGlobal`
  .euiPopover__panel.euiPopover__panel-isOpen {
    z-index: 9900 !important;
  }
  .euiToolTip {
    z-index: 9950 !important;
  }
`;

const Avatar = styled(EuiAvatar)`
  margin-left: 5px;
`;

Avatar.displayName = 'Avatar';

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

interface Props {
  associateNote: AssociateNote;
  createTimeline: CreateTimeline;
  isDataInTimeline: boolean;
  isDatepickerLocked: boolean;
  isFavorite: boolean;
  title: string;
  description: string;
  getNotesByIds: (noteIds: string[]) => Note[];
  noteIds: string[];
  timelineId: string;
  toggleLock: ToggleLock;
  updateDescription: UpdateDescription;
  updateIsFavorite: UpdateIsFavorite;
  updateTitle: UpdateTitle;
  updateNote: UpdateNote;
  usersViewing: string[];
  width: number;
}

interface State {
  showActions: boolean;
  showNotes: boolean;
}

const rightGutter = 60; // px
export const datePickerThreshold = 600;
export const showNotesThreshold = 810;
export const showDescriptionThreshold = 970;

const starIconWidth = 30;
const nameWidth = 155;
const descriptionWidth = 165;
const noteWidth = 130;
const settingsWidth = 50;

/** Displays the properties of a timeline, i.e. name, description, notes, etc */
export class Properties extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      showActions: false,
      showNotes: false,
    };
  }

  public onButtonClick = () => {
    this.setState(prevState => ({
      showActions: !prevState.showActions,
    }));
  };

  public onToggleShowNotes = () => {
    this.setState(state => ({ showNotes: !state.showNotes }));
  };

  public onClosePopover = () => {
    this.setState({
      showActions: false,
    });
  };

  public render() {
    const {
      associateNote,
      createTimeline,
      description,
      getNotesByIds,
      isFavorite,
      isDataInTimeline,
      isDatepickerLocked,
      title,
      noteIds,
      timelineId,
      updateDescription,
      updateIsFavorite,
      updateTitle,
      updateNote,
      usersViewing,
      width,
    } = this.props;

    const datePickerWidth =
      width -
      rightGutter -
      starIconWidth -
      nameWidth -
      (width >= showDescriptionThreshold ? descriptionWidth : 0) -
      noteWidth -
      settingsWidth;

    // Passing the styles directly to the component because the width is
    // being calculated and is recommended by Styled Components for performance
    // https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
    return (
      <TimelineProperties style={{ width }} data-test-subj="timeline-properties">
        <PropertiesLeft
          isFavorite={isFavorite}
          timelineId={timelineId}
          updateIsFavorite={updateIsFavorite}
          showDescription={width >= showDescriptionThreshold}
          description={description}
          title={title}
          updateTitle={updateTitle}
          updateDescription={updateDescription}
          showNotes={this.state.showNotes}
          showNotesFromWidth={width >= showNotesThreshold}
          associateNote={associateNote}
          getNotesByIds={getNotesByIds}
          noteIds={noteIds}
          onToggleShowNotes={this.onToggleShowNotes}
          updateNote={updateNote}
          isDatepickerLocked={isDatepickerLocked}
          toggleLock={this.toggleLock}
          datePickerWidth={
            datePickerWidth > datePickerThreshold ? datePickerThreshold : datePickerWidth
          }
        />
        <PropertiesRight
          onButtonClick={this.onButtonClick}
          onClosePopover={this.onClosePopover}
          showActions={this.state.showActions}
          createTimeline={createTimeline}
          timelineId={timelineId}
          isDataInTimeline={isDataInTimeline}
          showNotesFromWidth={width < showNotesThreshold}
          showNotes={this.state.showNotes}
          showDescription={width < showDescriptionThreshold}
          showUsersView={title.length > 0}
          usersViewing={usersViewing}
          description={description}
          updateDescription={updateDescription}
          associateNote={associateNote}
          getNotesByIds={getNotesByIds}
          noteIds={noteIds}
          onToggleShowNotes={this.onToggleShowNotes}
          updateNote={updateNote}
        />
      </TimelineProperties>
    );
  }

  private toggleLock = () => {
    this.props.toggleLock({ linkToId: 'timeline' });
  };
}
