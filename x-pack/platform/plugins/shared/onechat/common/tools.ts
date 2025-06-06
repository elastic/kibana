import type { EsqlTool } from '@kbn/onechat-common';

export type EsqlToolCreateRequest = Omit<
  EsqlTool,
  'id'
> & {
  id?: string;
};
