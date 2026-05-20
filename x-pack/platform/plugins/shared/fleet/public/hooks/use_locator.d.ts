import type { SerializableRecord } from '@kbn/utility-types';
import type { ValuesType } from 'utility-types';
import type { LOCATORS_IDS } from '../constants';
export declare function useLocator<T extends SerializableRecord>(locatorId: ValuesType<typeof LOCATORS_IDS>): import("@kbn/share-plugin/common").LocatorPublic<T> | undefined;
export declare function useDashboardLocator(): import("@kbn/share-plugin/common").LocatorPublic<SerializableRecord> | undefined;
export declare function useDiscoverLocator(): import("@kbn/share-plugin/common").LocatorPublic<SerializableRecord> | undefined;
