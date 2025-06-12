
import { EsqlTool } from "@kbn/onechat-server";


export type EsqlToolCreateRequest = Omit<EsqlTool, "id" | "schema" | "handler"> & {
  id: string;
}
