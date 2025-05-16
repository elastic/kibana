/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { ChangeEvent, FocusEvent, FunctionComponent, HTMLProps } from 'react';
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { AsyncState } from 'react-use/lib/useAsync';
import useAsync from 'react-use/lib/useAsync';

import type { BuildFlavor } from '@kbn/config';
import type {
  Capabilities,
  DocLinksStart,
  FatalErrorsSetup,
  HttpStart,
  NotificationsStart,
  ScopedHistory,
} from '@kbn/core/public';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { FeaturesPluginStart } from '@kbn/features-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate, useDarkMode } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { Cluster } from '@kbn/remote-clusters-plugin/public';
import { REMOTE_CLUSTERS_PATH } from '@kbn/remote-clusters-plugin/public';
import { KibanaPrivileges } from '@kbn/security-role-management-model';
import { API_VERSIONS as SPACES_API_VERSIONS } from '@kbn/spaces-plugin/common';
import type { Space, SpacesApiUi } from '@kbn/spaces-plugin/public';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { DeleteRoleButton } from './delete_role_button';
import { ElasticsearchPrivileges, KibanaPrivilegesRegion } from './privileges';
import { ReservedRoleBadge } from './reserved_role_badge';
import type { RoleValidationResult } from './validate_role';
import { RoleValidator } from './validate_role';
import type { StartServices } from '../../..';
import type {
  BuiltinESPrivileges,
  RawKibanaPrivileges,
  Role,
  RoleIndexPrivilege,
  SecurityLicense,
} from '../../../../common';
import {
  isRoleDeprecated as checkIfRoleDeprecated,
  isRoleReadOnly as checkIfRoleReadOnly,
  isRoleReserved as checkIfRoleReserved,
  copyRole,
  getExtendedRoleDeprecationNotice,
  prepareRoleClone,
} from '../../../../common/model';
import { useCapabilities } from '../../../components/use_capabilities';
import type { CheckSecurityFeaturesResponse } from '../../security_features';
import type { UserAPIClient } from '../../users';
import type { IndicesAPIClient } from '../indices_api_client';
import type { PrivilegesAPIClient } from '../privileges_api_client';
import type { RolesAPIClient } from '../roles_api_client';

export interface Props extends StartServices {
  action: 'edit' | 'clone';
  roleName?: string;
  dataViews?: DataViewsContract;
  userAPIClient: PublicMethodsOf<UserAPIClient>;
  indicesAPIClient: PublicMethodsOf<IndicesAPIClient>;
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
  privilegesAPIClient: PublicMethodsOf<PrivilegesAPIClient>;
  getFeatures: FeaturesPluginStart['getFeatures'];
  docLinks: DocLinksStart;
  http: HttpStart;
  license: SecurityLicense;
  uiCapabilities: Capabilities;
  notifications: NotificationsStart;
  fatalErrors: FatalErrorsSetup;
  history: ScopedHistory;
  spacesApiUi?: SpacesApiUi;
  buildFlavor: BuildFlavor;
  cloudOrgUrl?: string;
}

function useRemoteClusters(http: HttpStart) {
  return useAsync(() => http.get<Cluster[]>(REMOTE_CLUSTERS_PATH));
}

interface CheckSecurityFeaturesResponseWhenServerless {
  value: boolean;
}
function useFeatureCheck(
  http: HttpStart,
  buildFlavor: 'serverless'
): AsyncState<CheckSecurityFeaturesResponseWhenServerless>;

function useFeatureCheck(
  http: HttpStart,
  buildFlavor: BuildFlavor
): AsyncState<CheckSecurityFeaturesResponse>;

function useFeatureCheck(http: HttpStart, buildFlavor?: BuildFlavor) {
  return useAsync(async () => {
    if (buildFlavor !== 'serverless') {
      return http.get<CheckSecurityFeaturesResponse>('/internal/security/_check_security_features');
    }
    return { value: true };
  }, [http, buildFlavor]);
}

function useRunAsUsers(
  userAPIClient: PublicMethodsOf<UserAPIClient>,
  fatalErrors: FatalErrorsSetup,
  buildFlavor: BuildFlavor
) {
  const [userNames, setUserNames] = useState<string[] | null>(null);
  useEffect(() => {
    if (buildFlavor !== 'serverless') {
      userAPIClient.getUsers().then(
        (users) => setUserNames(users.map((user) => user.username)),
        (err) => fatalErrors.add(err)
      );
    } else {
      setUserNames([]);
    }
  }, [fatalErrors, userAPIClient, buildFlavor]);

  return userNames;
}

function useIndexPatternsTitles(
  dataViews: DataViewsContract,
  fatalErrors: FatalErrorsSetup,
  notifications: NotificationsStart
) {
  const [indexPatternsTitles, setIndexPatternsTitles] = useState<string[] | null>(null);
  useEffect(() => {
    dataViews
      .getTitles()
      .catch((err: IHttpFetchError) => {
        // If user doesn't have access to the index patterns they still should be able to create new
        // or edit existing role.
        if (err.response?.status === 403) {
          notifications.toasts.addDanger({
            title: i18n.translate('xpack.security.management.roles.noIndexPatternsPermission', {
              // Note: we are attempting to fetch data views (a Kibana construct), but we are using those to render a list of usable index
              // patterns (an Elasticsearch construct) for the user. This error message reflects what is shown on the UI.
              defaultMessage: 'You need permission to access the list of available index patterns.',
            }),
          });
          return [];
        }

        fatalErrors.add(err);
      })
      .then((titles) => setIndexPatternsTitles(titles.filter(Boolean)));
  }, [fatalErrors, dataViews, notifications]);

  return indexPatternsTitles;
}

function usePrivileges(
  privilegesAPIClient: PublicMethodsOf<PrivilegesAPIClient>,
  fatalErrors: FatalErrorsSetup
) {
  const [privileges, setPrivileges] = useState<[RawKibanaPrivileges, BuiltinESPrivileges] | null>(
    null
  );
  useEffect(() => {
    Promise.all([
      privilegesAPIClient.getAll({ includeActions: true, respectLicenseLevel: false }),
      privilegesAPIClient.getBuiltIn(),
    ]).then(
      ([kibanaPrivileges, builtInESPrivileges]) =>
        setPrivileges([kibanaPrivileges, builtInESPrivileges]),
      (err) => fatalErrors.add(err)
    );
  }, [privilegesAPIClient, fatalErrors]);

  return privileges;
}

function useRole(
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>,
  fatalErrors: FatalErrorsSetup,
  notifications: NotificationsStart,
  license: SecurityLicense,
  action: string,
  backToRoleList: () => void,
  roleName?: string
) {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const rolePromise = roleName
      ? rolesAPIClient.getRole(roleName)
      : Promise.resolve({
          name: '',
          description: '',
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [],
          _unrecognized_applications: [],
        } as Role);

    rolePromise
      .then((fetchedRole) => {
        if (action === 'clone' && checkIfRoleReserved(fetchedRole)) {
          backToRoleList();
          return;
        }

        const isEditingExistingRole = !!roleName && action === 'edit';
        if (!isEditingExistingRole && fetchedRole.elasticsearch.indices.length === 0) {
          const emptyOption: RoleIndexPrivilege = {
            names: [],
            privileges: [],
          };

          const { allowRoleDocumentLevelSecurity, allowRoleFieldLevelSecurity } =
            license.getFeatures();

          if (allowRoleFieldLevelSecurity) {
            emptyOption.field_security = {
              grant: ['*'],
              except: [],
            };
          }

          if (allowRoleDocumentLevelSecurity) {
            emptyOption.query = '';
          }

          fetchedRole.elasticsearch.indices.push(emptyOption);
        }

        setRole(action === 'clone' ? prepareRoleClone(fetchedRole) : copyRole(fetchedRole));
      })
      .catch((err: IHttpFetchError) => {
        if (err.response?.status === 404) {
          notifications.toasts.addDanger({
            title: i18n.translate('xpack.security.management.roles.roleNotFound', {
              defaultMessage: 'No "{roleName}" role found.',
              values: { roleName },
            }),
          });
          backToRoleList();
        } else {
          fatalErrors.add(err);
        }
      });
  }, [roleName, action, fatalErrors, rolesAPIClient, notifications, license, backToRoleList]);

  return [role, setRole] as [Role | null, typeof setRole];
}

function useSpaces(http: HttpStart, fatalErrors: FatalErrorsSetup) {
  const [spaces, setSpaces] = useState<{ enabled: boolean; list: Space[] } | null>(null);
  useEffect(() => {
    http.get<Space[]>('/api/spaces/space', { version: SPACES_API_VERSIONS.public.v1 }).then(
      (fetchedSpaces) => setSpaces({ enabled: true, list: fetchedSpaces }),
      (err: IHttpFetchError) => {
        // Spaces plugin can be disabled and hence this endpoint can be unavailable.
        if (err.response?.status === 404) {
          setSpaces({ enabled: false, list: [] });
        } else {
          fatalErrors.add(err);
        }
      }
    );
  }, [http, fatalErrors]);

  return spaces;
}

function useFeatures(
  getFeatures: FeaturesPluginStart['getFeatures'],
  fatalErrors: FatalErrorsSetup
) {
  const [features, setFeatures] = useState<KibanaFeature[] | null>(null);
  useEffect(() => {
    getFeatures()
      .catch((err: IHttpFetchError) => {
        // Currently, the `/api/features` endpoint effectively requires the "Global All" kibana privilege (e.g., what
        // the `kibana_user` grants), because it returns information about all registered features (#35841). It's
        // possible that a user with `manage_security` will attempt to visit the role management page without the
        // correct Kibana privileges. If that's the case, then they receive a partial view of the role, and the UI does
        // not allow them to make changes to that role's kibana privileges. When this user visits the edit role page,
        // this API endpoint will throw a 403, which causes view to fail completely. So we instead attempt to detect the
        // 403 here, and respond in a way that still allows the UI to render itself.
        const unauthorizedForFeatures = err.response?.status === 403;
        if (unauthorizedForFeatures) {
          return [] as KibanaFeature[];
        }
        fatalErrors.add(err);
      })
      .then((retrievedFeatures) => {
        setFeatures(retrievedFeatures?.filter((feature) => !feature.hidden) ?? null);
      });
  }, [fatalErrors, getFeatures]);

  return features;
}

export const EditRolePage: FunctionComponent<Props> = ({
  userAPIClient,
  dataViews,
  rolesAPIClient,
  indicesAPIClient,
  privilegesAPIClient,
  getFeatures,
  http,
  roleName,
  action,
  fatalErrors,
  license,
  docLinks,
  uiCapabilities,
  notifications,
  history,
  spacesApiUi,
  buildFlavor,
  cloudOrgUrl,
  ...startServices
}) => {
  const isDarkMode = useDarkMode();

  if (!dataViews) {
    // The dataViews plugin is technically marked as an optional dependency because we don't need to pull it in for Anonymous pages (such
    // as the login page). That said, it _is_ required for this page to function correctly, so we throw an error here if it's not available.
    // We don't ever expect Kibana to work correctly if the dataViews plugin is not available (and we don't expect this to happen at all),
    // so this error edge case is an acceptable tradeoff.
    throw new Error('The dataViews plugin is required for this page, but it is not available');
  }
  const backToRoleList = useCallback(() => history.push('/'), [history]);
  const hasReadOnlyPrivileges = !useCapabilities('roles').save;

  // We should keep the same mutable instance of Validator for every re-render since we'll
  // eventually enable validation after the first time user tries to save a role.
  const { current: validator } = useRef(new RoleValidator({ shouldValidate: false, buildFlavor }));
  const [formError, setFormError] = useState<RoleValidationResult | null>(null);
  const [creatingRoleAlreadyExists, setCreatingRoleAlreadyExists] = useState<boolean>(false);
  const [previousName, setPreviousName] = useState<string>('');
  const runAsUsers = useRunAsUsers(userAPIClient, fatalErrors, buildFlavor);
  const indexPatternsTitles = useIndexPatternsTitles(dataViews, fatalErrors, notifications);
  const privileges = usePrivileges(privilegesAPIClient, fatalErrors);
  const spaces = useSpaces(http, fatalErrors);
  const features = useFeatures(getFeatures, fatalErrors);
  const featureCheckState = useFeatureCheck(http, buildFlavor);
  const remoteClustersState = useRemoteClusters(http);
  const [role, setRole] = useRole(
    rolesAPIClient,
    fatalErrors,
    notifications,
    license,
    action,
    backToRoleList,
    roleName
  );

  const isEditingExistingRole = !!roleName && action === 'edit';

  useEffect(() => {
    if (hasReadOnlyPrivileges && !isEditingExistingRole) {
      backToRoleList();
    }
  }, [hasReadOnlyPrivileges, isEditingExistingRole]); // eslint-disable-line react-hooks/exhaustive-deps

  if (
    !role ||
    !runAsUsers ||
    !indexPatternsTitles ||
    !privileges ||
    !spaces ||
    !features ||
    !featureCheckState.value
  ) {
    return null;
  }

  const isRoleReadOnly = hasReadOnlyPrivileges || checkIfRoleReadOnly(role);
  const isRoleReserved = checkIfRoleReserved(role);
  const isDeprecatedRole = checkIfRoleDeprecated(role);

  const [kibanaPrivileges, builtInESPrivileges] = privileges;

  const getFormTitle = () => {
    let titleText: JSX.Element;
    const props: HTMLProps<HTMLDivElement> = {
      tabIndex: 0,
    };
    if (isRoleReserved || isRoleReadOnly) {
      titleText = (
        <FormattedMessage
          id="xpack.security.management.editRole.viewingRoleTitle"
          defaultMessage="Viewing role"
        />
      );
      props['aria-describedby'] = 'reservedRoleDescription';
    } else if (isEditingExistingRole) {
      titleText = (
        <FormattedMessage
          id="xpack.security.management.editRole.editRoleTitle"
          defaultMessage="Edit role"
        />
      );
    } else {
      titleText = (
        <FormattedMessage
          id="xpack.security.management.editRole.createRoleTitle"
          defaultMessage="Create role"
        />
      );
    }

    return (
      <EuiTitle size="l">
        <h1 {...props}>
          {titleText} <ReservedRoleBadge role={role} />
        </h1>
      </EuiTitle>
    );
  };

  const getActionButton = () => {
    if (isEditingExistingRole && !isRoleReadOnly) {
      return (
        <EuiFlexItem grow={false}>
          <DeleteRoleButton
            roleName={role.name}
            canDelete={true}
            onDelete={handleDeleteRole}
            buildFlavor={buildFlavor}
          />
        </EuiFlexItem>
      );
    }

    return null;
  };

  const getRoleNameAndDescription = () => {
    return (
      <EuiPanel hasShadow={false} hasBorder={true}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              data-test-subj={'roleNameFormRow'}
              label={
                <FormattedMessage
                  id="xpack.security.management.editRole.roleNameFormRowTitle"
                  defaultMessage="Role name"
                />
              }
              helpText={
                !isEditingExistingRole ? (
                  <FormattedMessage
                    id="xpack.security.management.createRole.roleNameFormRowHelpText"
                    defaultMessage="Once the role is created you can no longer edit its name."
                  />
                ) : !isRoleReserved ? (
                  <FormattedMessage
                    id="xpack.security.management.editRole.roleNameFormRowHelpText"
                    defaultMessage="A role's name cannot be changed once it has been created."
                  />
                ) : undefined
              }
              {...validator.validateRoleName(role)}
              {...(creatingRoleAlreadyExists
                ? { error: 'A role with this name already exists.', isInvalid: true }
                : {})}
            >
              <EuiFieldText
                name={'name'}
                value={role.name || ''}
                onChange={onNameChange}
                onBlur={onNameBlur}
                data-test-subj={'roleFormNameInput'}
                disabled={isRoleReserved || isEditingExistingRole || isRoleReadOnly}
                isInvalid={creatingRoleAlreadyExists}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              data-test-subj="roleDescriptionFormRow"
              label={
                <FormattedMessage
                  id="xpack.security.management.editRole.roleDescriptionFormRowTitle"
                  defaultMessage="Role description"
                />
              }
            >
              {isRoleReserved || isRoleReadOnly ? (
                <EuiToolTip
                  content={role.description}
                  display="block"
                  data-test-subj="roleFormDescriptionTooltip"
                >
                  <EuiFieldText
                    name="description"
                    value={role.description ?? ''}
                    data-test-subj="roleFormDescriptionInput"
                    disabled
                  />
                </EuiToolTip>
              ) : (
                <EuiFieldText
                  name="description"
                  value={role.description ?? ''}
                  onChange={onDescriptionChange}
                  data-test-subj="roleFormDescriptionInput"
                />
              )}
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  };

  const onNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    setRole({
      ...role,
      name: e.target.value,
    });

  const onNameBlur = (_e: FocusEvent<HTMLInputElement>) => {
    if (!isEditingExistingRole && previousName !== role.name) {
      setPreviousName(role.name);
      doesRoleExist().then((roleExists) => {
        setCreatingRoleAlreadyExists(roleExists);
      });
    }
  };

  const onDescriptionChange = (e: ChangeEvent<HTMLInputElement>) =>
    setRole({
      ...role,
      description: e.target.value.trim().length ? e.target.value : undefined,
    });

  const getElasticsearchPrivileges = () => {
    return (
      <ElasticsearchPrivileges
        role={role}
        editable={!isRoleReadOnly}
        indicesAPIClient={indicesAPIClient}
        onChange={onRoleChange}
        runAsUsers={runAsUsers}
        validator={validator}
        indexPatterns={indexPatternsTitles}
        remoteClusters={remoteClustersState.value}
        builtinESPrivileges={builtInESPrivileges}
        license={license}
        docLinks={docLinks}
        canUseRemoteIndices={
          buildFlavor === 'traditional' && featureCheckState.value?.canUseRemoteIndices
        }
        canUseRemoteClusters={
          buildFlavor === 'traditional' && featureCheckState.value?.canUseRemoteClusters
        }
        isDarkMode={isDarkMode}
        buildFlavor={buildFlavor}
      />
    );
  };

  const onRoleChange = (newRole: Role) => setRole(newRole);

  const getKibanaPrivileges = () => {
    return (
      <KibanaPrivilegesRegion
        kibanaPrivileges={new KibanaPrivileges(kibanaPrivileges, features)}
        spaces={spaces.list}
        spacesEnabled={spaces.enabled}
        uiCapabilities={uiCapabilities}
        canCustomizeSubFeaturePrivileges={license.getFeatures().allowSubFeaturePrivileges}
        editable={!isRoleReadOnly}
        role={role}
        onChange={onRoleChange}
        validator={validator}
        spacesApiUi={spacesApiUi}
      />
    );
  };

  const getFormButtons = () => {
    if (isRoleReadOnly) {
      return getReturnToRoleListButton();
    }

    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>{getSaveButton()}</EuiFlexItem>
        <EuiFlexItem grow={false}>{getCancelButton()}</EuiFlexItem>
        <EuiFlexItem grow={true} />
        {getActionButton()}
      </EuiFlexGroup>
    );
  };

  const getReturnToRoleListButton = () => {
    return (
      <EuiButton
        {...reactRouterNavigate(history, '')}
        iconType="arrowLeft"
        data-test-subj="roleFormReturnButton"
      >
        <FormattedMessage
          id="xpack.security.management.editRole.returnToRoleListButtonLabel"
          defaultMessage="Back to roles"
        />
      </EuiButton>
    );
  };

  const getSaveButton = () => {
    const saveText = isEditingExistingRole ? (
      <FormattedMessage
        id="xpack.security.management.editRole.updateRoleText"
        defaultMessage="Update role"
      />
    ) : (
      <FormattedMessage
        id="xpack.security.management.editRole.createRoleText"
        defaultMessage="Create role"
      />
    );

    return (
      <EuiButton
        data-test-subj={`roleFormSaveButton`}
        fill
        onClick={saveRole}
        disabled={isRoleReserved || creatingRoleAlreadyExists}
      >
        {saveText}
      </EuiButton>
    );
  };

  const getCancelButton = () => {
    return (
      <EuiButtonEmpty data-test-subj={`roleFormCancelButton`} onClick={backToRoleList}>
        <FormattedMessage
          id="xpack.security.management.editRole.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      </EuiButtonEmpty>
    );
  };

  const saveRole = async () => {
    validator.enableValidation();

    const result = validator.validateForSave(role);
    if (result.isInvalid) {
      setFormError(result);
    } else {
      setFormError(null);

      try {
        await rolesAPIClient.saveRole({ role, createOnly: !isEditingExistingRole });
      } catch (error) {
        if (!isEditingExistingRole && error?.body?.statusCode === 409) {
          setCreatingRoleAlreadyExists(true);
          window.scroll({ top: 0, behavior: 'smooth' });
          return;
        }
        notifications.toasts.addDanger(
          error?.body?.message ??
            i18n.translate('xpack.security.management.editRole.errorSavingRoleError', {
              defaultMessage: 'Error saving role',
            })
        );
        return;
      }

      if (buildFlavor === 'serverless') {
        notifications.toasts.addSuccess({
          title: i18n.translate(
            'xpack.security.management.editRole.customRoleSuccessfullySavedNotificationTitle',
            { defaultMessage: 'Custom role saved' }
          ),
          text: toMountPoint(
            <>
              <p>
                <FormattedMessage
                  id="xpack.security.management.editRole.customRoleSuccessfullySavedNotificationText"
                  defaultMessage="You can now assign this role to users of this project from your Organization page."
                />
              </p>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton size="s" href={cloudOrgUrl}>
                    Assign role
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>,
            startServices
          ),
        });
      } else {
        if (isEditingExistingRole) {
          notifications.toasts.addSuccess(
            i18n.translate(
              'xpack.security.management.editRole.roleSuccessfullyUpdatedNotificationMessage',
              { defaultMessage: 'Updated role' }
            )
          );
        } else {
          notifications.toasts.addSuccess(
            i18n.translate(
              'xpack.security.management.editRole.roleSuccessfullyCreatedNotificationMessage',
              { defaultMessage: 'Created role' }
            )
          );
        }
      }

      backToRoleList();
    }
  };

  const doesRoleExist = async (): Promise<boolean> => {
    try {
      await rolesAPIClient.getRole(role.name);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleDeleteRole = async () => {
    try {
      await rolesAPIClient.deleteRole(role.name);
    } catch (error) {
      notifications.toasts.addDanger(
        error?.data?.message ??
          i18n.translate('xpack.security.management.editRole.errorDeletingRoleError', {
            defaultMessage: 'Error deleting role',
          })
      );
      return;
    }

    if (buildFlavor === 'serverless') {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.security.management.roles.deleteRolesSuccessTitle', {
          defaultMessage:
            '{numberOfCustomRoles, plural, one {# custom role} other {# custom roles}} deleted',
          values: { numberOfCustomRoles: 1 },
        }),
        text: toMountPoint(
          <>
            <p>
              {i18n.translate('xpack.security.management.roles.deleteRolesSuccessMessage', {
                defaultMessage: `The deleted role will still appear listed on the user profile in Organization
                  Management and on the User Profile for those that don't have admin access.`,
              })}
            </p>

            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton size="s" href={cloudOrgUrl}>
                  {i18n.translate('xpack.security.management.roles.manageRoleUsers', {
                    defaultMessage: 'Manage Members',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>,
          startServices
        ),
      });
    } else {
      notifications.toasts.addSuccess(
        i18n.translate(
          'xpack.security.management.editRole.roleSuccessfullyDeletedNotificationMessage',
          { defaultMessage: 'Deleted role' }
        )
      );
    }

    backToRoleList();
  };

  return (
    <div className="editRolePage">
      <EuiForm {...formError} fullWidth>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            {getFormTitle()}
            <EuiSpacer />
            <EuiText size="s">
              <FormattedMessage
                id="xpack.security.management.editRole.setPrivilegesToKibanaSpacesDescription"
                defaultMessage="Set privileges on your Elasticsearch data and control access to your Project spaces."
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            {isRoleReserved && (
              <Fragment>
                <EuiText size="s" color="subdued">
                  <p id="reservedRoleDescription" tabIndex={0}>
                    <FormattedMessage
                      id="xpack.security.management.editRole.modifyingReversedRolesDescription"
                      defaultMessage="Reserved roles are built-in and cannot be removed or modified."
                    />
                  </p>
                </EuiText>
              </Fragment>
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            {isDeprecatedRole && (
              <Fragment>
                <EuiSpacer size="s" />
                <EuiCallOut
                  title={getExtendedRoleDeprecationNotice(role)}
                  color="warning"
                  iconType="warning"
                />
              </Fragment>
            )}
          </EuiFlexItem>
          <EuiFlexItem>{getRoleNameAndDescription()}</EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.security.management.editRole.dataLayerLabel"
                  defaultMessage="Data Layer"
                />
              }
            >
              {getElasticsearchPrivileges()}
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <FormattedMessage
                      id="xpack.security.management.editRole.appLayerLabel"
                      defaultMessage="Application layer"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIconTip
                      type="iInCircle"
                      color="subdued"
                      content={
                        <FormattedMessage
                          id="xpack.security.management.editRole.appLayerTooltipText"
                          defaultMessage="Feature access is granted on a per space basis for all features. Feature visibility is set on the space. Both must be enabled for this role to use a feature"
                        />
                      }
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
            >
              {getKibanaPrivileges()}
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow fullWidth={false}>{getFormButtons()}</EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </div>
  );
};
