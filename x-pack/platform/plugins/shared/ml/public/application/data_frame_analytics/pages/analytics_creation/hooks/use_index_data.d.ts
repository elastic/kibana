import type { CoreSetup } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { type RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { UseIndexDataReturnType } from '@kbn/ml-data-grid';
export declare const useIndexData: (dataView: DataView, query: Record<string, any> | undefined, toastNotifications: CoreSetup["notifications"]["toasts"], runtimeMappings?: RuntimeMappings) => UseIndexDataReturnType;
