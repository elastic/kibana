/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useController, useForm } from 'react-hook-form';

import type { BoostLimits } from '../../../common/profile_validation';
import type { BoostProfile, BoostProfileType, BoostRuleMatch } from '../../../common/types';
import { validateName } from '../../../common/validation';
import { CANCEL_BUTTON_LABEL, PROFILE_TYPE_LABELS } from '../../translations';
import { AppliesToFooter } from '../applies_to_footer/applies_to_footer';
import { BoostFields } from './boost_fields';
import { CardLabel, FLYOUT_PADDING_SIZE, FormSection, FullWidthRule } from './form_layout';
import { IndicesOptions } from './indices_options';
import type { BoostProfileInput, ProfileFormValues } from './profile_form_values';
import {
  getDefaultValues,
  toProfileInput,
  toTimelineProfile,
  withProfileSettings,
} from './profile_form_values';
import {
  ADDITIONAL_OPTIONS_TITLE,
  BACK_BUTTON_LABEL,
  BOOST_TITLE,
  DESCRIPTION,
  LEARN_MORE_LINK,
  NAME_HELP_TEXT,
  NAME_LABEL,
  NAME_TAKEN_ERROR,
  TYPE_DESCRIPTION,
  TYPE_DESCRIPTIONS,
  TYPE_TITLE,
  getBoostDescription,
} from './translations';

export type { BoostProfileInput } from './profile_form_values';

export interface ProfileSaveButton {
  /** Tells the buttons apart, and adds a suffix to their `data-test-subj`. */
  id: string;
  label: string;
  onSave: (profile: BoostProfileInput) => void;
}

export interface ProfileFlyoutProps {
  title: string;
  /** The profile to edit. Without one, the flyout creates a profile. */
  profile?: BoostProfile;
  /** The type a new profile starts with. */
  type?: BoostProfileType;
  /** Keeps a new profile to `type`, shown under the title instead of offered as a choice. */
  isTypeFixed?: boolean;
  /** Leaves out the fixed type under a title that already names it, as for a project default. */
  isTypeInTitle?: boolean;
  limits: BoostLimits;
  /** The boost docs, linked from the description of the boost fields. */
  docsUrl?: string;
  /** What the profile applies to, shown above the buttons along with `storageSizeInBytes`. */
  matches?: readonly BoostRuleMatch[];
  storageSizeInBytes?: number;
  /** Left to right. The last one is the primary button. */
  saveButtons: readonly ProfileSaveButton[];
  isSaving?: boolean;
  /** Passed when saving finds that a boost profile already has the name. */
  isNameTaken?: boolean;
  onClose: () => void;
}

export interface ProfileFlyoutContentProps extends ProfileFlyoutProps {
  /** The id of the title, which labels the flyout the content is in. */
  titleId: string;
  /** Shows a back button, for content in place of another flyout's. */
  onBack?: () => void;
}

const PROFILE_TYPES: readonly BoostProfileType[] = ['indices', 'data_streams'];

const fillStyles = css`
  flex-grow: 1;
`;

const getInitialValues = (
  profile: BoostProfile | undefined,
  type: BoostProfileType,
  limits: BoostLimits
): ProfileFormValues =>
  profile
    ? {
        ...withProfileSettings(getDefaultValues(profile.type, limits), profile),
        name: profile.name,
      }
    : getDefaultValues(type, limits);

/**
 * The header, body, and footer of the profile flyout, to show in another flyout too.
 */
export const ProfileFlyoutContent = ({
  title,
  profile,
  type: initialType = 'indices',
  isTypeFixed = false,
  isTypeInTitle = false,
  limits,
  docsUrl,
  matches,
  storageSizeInBytes,
  saveButtons,
  isSaving = false,
  isNameTaken = false,
  titleId,
  onBack,
  onClose,
}: ProfileFlyoutContentProps) => {
  const typeRadioName = useGeneratedHtmlId({ prefix: 'searchBoostProfileFlyoutType' });
  const isEditing = profile !== undefined;
  const [initialValues] = useState(() => getInitialValues(profile, initialType, limits));
  const [savingButtonId, setSavingButtonId] = useState<string>();

  const { control, handleSubmit, setError, watch } = useForm<ProfileFormValues>({
    defaultValues: initialValues,
  });

  const { field: nameField, fieldState: nameState } = useController({
    control,
    name: 'name',
    rules: { validate: (name) => isEditing || (validateName(name)?.message ?? true) },
  });

  const { field: typeField } = useController({ control, name: 'type' });

  const values = watch();
  const { type } = values;
  const isTypeSelectionEnabled = !isEditing && !isTypeFixed;
  const showsTypeBadge = isEditing || (isTypeFixed && !isTypeInTitle);
  const loadingButtonId = savingButtonId ?? saveButtons[saveButtons.length - 1]?.id;

  // Waits for saving to end, since the field is disabled until then and can't take focus.
  useEffect(() => {
    if (isNameTaken && !isSaving && !isEditing) {
      setError('name', { type: 'taken', message: NAME_TAKEN_ERROR }, { shouldFocus: true });
    }
  }, [isNameTaken, isSaving, isEditing, setError]);

  const save = ({ id, onSave }: ProfileSaveButton) =>
    handleSubmit((submitted) => {
      setSavingButtonId(id);
      onSave(toProfileInput({ ...submitted, name: profile?.name ?? submitted.name }));
    });

  const boostDescription = (
    <>
      {getBoostDescription(limits.minBoost, limits.maxBoost)}
      {docsUrl ? (
        <>
          {' '}
          <EuiLink
            href={docsUrl}
            target="_blank"
            external
            data-test-subj="searchBoostProfileFlyoutLearnMore"
          >
            {LEARN_MORE_LINK}
          </EuiLink>
        </>
      ) : null}
    </>
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        {onBack ? (
          <>
            <EuiButtonEmpty
              size="xs"
              color="text"
              iconType="undo"
              flush="left"
              onClick={onBack}
              data-test-subj="searchBoostProfileFlyoutBack"
            >
              {BACK_BUTTON_LABEL}
            </EuiButtonEmpty>
            <EuiSpacer size="s" />
          </>
        ) : null}
        <EuiTitle size="s">
          <h2 id={titleId}>{title}</h2>
        </EuiTitle>
        {showsTypeBadge ? (
          <>
            <EuiSpacer size="s" />
            <EuiBadge color="hollow" data-test-subj="searchBoostProfileFlyoutType">
              {PROFILE_TYPE_LABELS[type]}
            </EuiBadge>
          </>
        ) : null}
        <EuiSpacer size={showsTypeBadge ? 's' : 'xs'} />
        <EuiText size="xs" color="subdued">
          <p>{DESCRIPTION}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isEditing ? null : (
          <EuiFormRow
            fullWidth
            display="rowCompressed"
            label={NAME_LABEL}
            helpText={NAME_HELP_TEXT}
            isInvalid={Boolean(nameState.error)}
            error={nameState.error?.message}
          >
            <EuiFieldText
              fullWidth
              compressed
              value={nameField.value}
              isInvalid={Boolean(nameState.error)}
              disabled={isSaving}
              inputRef={nameField.ref}
              onChange={(event) => nameField.onChange(event.target.value)}
              onBlur={nameField.onBlur}
              data-test-subj="searchBoostProfileFlyoutName"
            />
          </EuiFormRow>
        )}
        {isTypeSelectionEnabled ? (
          <FormSection
            title={TYPE_TITLE}
            description={TYPE_DESCRIPTION}
            data-test-subj="searchBoostProfileFlyoutTypeSection"
          >
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {PROFILE_TYPES.map((option) => (
                <EuiFlexItem key={option}>
                  <EuiCheckableCard
                    id={`${typeRadioName}-${option}`}
                    name={typeRadioName}
                    value={option}
                    css={fillStyles}
                    label={
                      <CardLabel
                        title={PROFILE_TYPE_LABELS[option]}
                        description={TYPE_DESCRIPTIONS[option]}
                      />
                    }
                    checked={type === option}
                    disabled={isSaving}
                    onChange={() => typeField.onChange(option)}
                    data-test-subj={`searchBoostProfileFlyoutTypeOption-${option}`}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </FormSection>
        ) : null}
        <FormSection
          title={BOOST_TITLE}
          description={boostDescription}
          hasRule={!isEditing}
          data-test-subj="searchBoostProfileFlyoutBoostSection"
        >
          <BoostFields control={control} type={type} limits={limits} isDisabled={isSaving} />
        </FormSection>
        {type === 'indices' ? (
          <FormSection
            title={ADDITIONAL_OPTIONS_TITLE}
            data-test-subj="searchBoostProfileFlyoutOptionsSection"
          >
            <IndicesOptions control={control} isDisabled={isSaving} />
          </FormSection>
        ) : null}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        {matches && storageSizeInBytes !== undefined ? (
          <>
            <AppliesToFooter
              type={type}
              matches={matches}
              storageSizeInBytes={storageSizeInBytes}
              profile={
                type === 'data_streams' ? toTimelineProfile(values, initialValues) : undefined
              }
            />
            <FullWidthRule margin="s" />
          </>
        ) : null}
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="left"
              onClick={onClose}
              data-test-subj="searchBoostProfileFlyoutCancel"
            >
              {CANCEL_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {saveButtons.map((button, index) => (
                <EuiFlexItem key={button.id} grow={false}>
                  <EuiButton
                    size="s"
                    fill={index === saveButtons.length - 1}
                    isLoading={isSaving && button.id === loadingButtonId}
                    isDisabled={isSaving}
                    onClick={save(button)}
                    data-test-subj={`searchBoostProfileFlyoutSave-${button.id}`}
                  >
                    {button.label}
                  </EuiButton>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

/** Creates or edits a boost profile, in a flyout of its own. */
export const ProfileFlyout = (props: ProfileFlyoutProps) => {
  const { onClose } = props;
  const titleId = useGeneratedHtmlId({ prefix: 'searchBoostProfileFlyoutTitle' });

  return (
    <EuiFlyout
      size="m"
      paddingSize={FLYOUT_PADDING_SIZE}
      aria-labelledby={titleId}
      onClose={onClose}
      data-test-subj="searchBoostProfileFlyout"
    >
      <ProfileFlyoutContent {...props} titleId={titleId} />
    </EuiFlyout>
  );
};
