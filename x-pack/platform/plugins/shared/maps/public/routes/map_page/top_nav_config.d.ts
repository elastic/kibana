import type { Adapters } from '@kbn/inspector-plugin/public';
import type { ScopedHistory } from '@kbn/core/public';
import type { SavedMap } from './saved_map';
export declare function getTopNavConfig({ savedMap, isOpenSettingsDisabled, isSaveDisabled, enableFullScreen, openMapSettings, inspectorAdapters, history, }: {
    savedMap: SavedMap;
    isOpenSettingsDisabled: boolean;
    isSaveDisabled: boolean;
    enableFullScreen: () => void;
    openMapSettings: () => void;
    inspectorAdapters: Adapters;
    history: ScopedHistory;
}): ({
    id: string;
    label: string;
    description: string;
    testId: string;
    iconType?: undefined;
    emphasize?: undefined;
    tooltip?: undefined;
} | {
    id: string;
    label: string;
    description: string;
    testId: string;
    disableButton?: undefined;
    iconType?: undefined;
    emphasize?: undefined;
    tooltip?: undefined;
} | {
    label: string;
    run: () => void;
    testId: string;
    description: string;
    id?: undefined;
    disableButton?: undefined;
    iconType?: undefined;
    emphasize?: undefined;
    tooltip?: undefined;
} | {
    id: string;
    iconType: string | undefined;
    label: string;
    description: string;
    emphasize: boolean;
    testId: string;
    run: () => void;
} | {
    id: string;
    label: string;
    emphasize: boolean;
    iconType: string;
    run: () => void;
    testId: string;
    description?: undefined;
    disableButton?: undefined;
    tooltip?: undefined;
})[];
