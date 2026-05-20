import type { FileLayer } from '@elastic/ems-client';
import type { Datatable } from '@kbn/expressions-plugin/public';
export declare function getEmsSuggestion(emsFileLayers: FileLayer[], table: Datatable, regionAccessor: string): import("../../ems_autosuggest").EMSTermJoinConfig | null;
