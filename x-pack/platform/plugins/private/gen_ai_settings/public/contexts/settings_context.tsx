import React from 'react'
import { createContext, useContext } from "react";
import type {
    FieldDefinition,
    OnFieldChangeFn,
    UiSettingMetadata,
    UnsavedFieldChange,
} from '@kbn/management-settings-types';
import { useKibana } from '../hooks/use_kibana';
import { isEmpty } from 'lodash';
import { IUiSettingsClient, UiSettingsType } from '@kbn/core/public';
import { normalizeSettings } from '@kbn/management-settings-utilities';
import { getFieldDefinition } from '@kbn/management-settings-field-definition';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type SettingsContext = ReturnType<typeof Settings>;

const SettingsContext = createContext<null | SettingsContext>(null);

const useSettingsContext = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error(
            "useSettingsContext must be inside of a AuthenticationContext.Provider."
        );
    }
    return context;
};

export const SettingsContextProvider = ({
    children,
    settingsKeys
}: {
    children: React.ReactElement;
    settingsKeys: string[];
}) => {
    const value = Settings({ settingsKeys });
    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

function getSettingsFields({
    settingsKeys,
    uiSettings,
}: {
    settingsKeys: string[];
    uiSettings?: IUiSettingsClient;
}) {
    if (!uiSettings) {
        return {};
    }
    const uiSettingsDefinition = uiSettings.getAll();
    const normalizedSettings = normalizeSettings(uiSettingsDefinition);

    return settingsKeys.reduce((acc, key) => {
        const setting: UiSettingMetadata = normalizedSettings[key];
        if (setting) {
            const field = getFieldDefinition({
                id: key,
                setting,
                params: { isCustom: uiSettings.isCustom(key), isOverridden: uiSettings.isOverridden(key) },
            });
            acc[key] = field;
        }
        return acc;
    }, {} as Record<string, FieldDefinition>);

}

const Settings = ({
    settingsKeys
}: {
    settingsKeys: string[];
}) => {
    const {
        services: { settings },
    } = useKibana();

    const [unsavedChanges, setUnsavedChanges] = React.useState<Record<string, UnsavedFieldChange>>(
        {}
    );

    const queryClient = useQueryClient();

    const fieldsQuery = useQuery({
        queryKey: ['settingsFields', settingsKeys],
        queryFn: async () => {
            return getSettingsFields({ settingsKeys, uiSettings: settings?.client });
        },
        "refetchOnWindowFocus": true,
    })

    const saveSingleSettingMutation = useMutation({
        "mutationFn": async ({ id, change }: {
            id: string,
            change: UnsavedFieldChange<UiSettingsType>['unsavedValue']
        }) => {
            await settings.client.set(id, change);
            queryClient.invalidateQueries({ queryKey: ['settingsFields', settingsKeys] });
        }
    });

    const saveAllMutation = useMutation({
        "mutationFn": async () => {
            if (settings && !isEmpty(unsavedChanges)) {
                let updateErrorOccurred = false;
                const subscription = settings.client.getUpdateErrors$().subscribe((error) => {
                    updateErrorOccurred = true;
                });
                try {
                    await Promise.all(Object.entries(unsavedChanges).map(([key, value]) =>
                        settings.client.set(key, value.unsavedValue)
                    ));
                    queryClient.invalidateQueries({ queryKey: ['settingsFields', settingsKeys] });
                    cleanUnsavedChanges();
                    if (updateErrorOccurred) {
                        throw new Error('One or more settings updates failed');
                    }
                } catch (e) {
                    throw e;
                } finally {
                    if (subscription) {
                        subscription.unsubscribe();
                    }
                }
            }
        }
    })


    const handleFieldChange: OnFieldChangeFn = (id, change) => {
        if (!change) {
            const { [id]: unsavedChange, ...rest } = unsavedChanges;
            setUnsavedChanges(rest);
            return;
        }
        setUnsavedChanges((changes) => ({ ...changes, [id]: change }));
    };

    function cleanUnsavedChanges() {
        setUnsavedChanges({});
    }

    return {
        fields: fieldsQuery.data ?? {},
        unsavedChanges,
        handleFieldChange,
        saveAll: saveAllMutation.mutate,
        isSaving: saveAllMutation.isLoading || saveSingleSettingMutation.isLoading,
        cleanUnsavedChanges,
        saveSingleSetting: saveSingleSettingMutation.mutate,
    };
};

export { SettingsContext, useSettingsContext };