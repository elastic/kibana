# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: global.setup.ts >> Streams eval setup
- Location: x-pack/platform/packages/shared/kbn-evals-suite-streams/evals/global.setup.ts:56:30

# Error details

```
AxiosError: Request failed with status code 400
```

# Test source

```ts
  37  |   return (strings: TemplateStringsArray, ...args: Array<string | number>) => {
  38  |     const path = uriencode(strings, ...args);
  39  |     return path.startsWith('/') || path === '' ? `${prefix}${path}` : `${prefix}/${path}`;
  40  |   };
  41  | };
  42  | 
  43  | export const uriencode = (
  44  |   strings: TemplateStringsArray,
  45  |   ...values: Array<string | number | boolean>
  46  | ) => {
  47  |   const queue = strings.slice();
  48  | 
  49  |   if (queue.length === 0) {
  50  |     throw new Error('how could strings passed to `uriencode` template tag be empty?');
  51  |   }
  52  | 
  53  |   if (queue.length !== values.length + 1) {
  54  |     throw new Error('strings and values passed to `uriencode` template tag are unbalanced');
  55  |   }
  56  | 
  57  |   // pull the first string off the queue, there is one less item in `values`
  58  |   // since the values are always wrapped in strings, so we shift the extra string
  59  |   // off the queue to balance the queue and values array.
  60  |   const leadingString = queue.shift()!;
  61  |   return queue.reduce(
  62  |     (acc, string, i) => `${acc}${encodeURIComponent(values[i])}${string}`,
  63  |     leadingString
  64  |   );
  65  | };
  66  | 
  67  | const DEFAULT_MAX_ATTEMPTS = 5;
  68  | 
  69  | export interface ReqOptions {
  70  |   description?: string;
  71  |   path: string;
  72  |   query?: Record<string, any>;
  73  |   method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  74  |   body?: any;
  75  |   retries?: number;
  76  |   headers?: Record<string, string>;
  77  |   ignoreErrors?: number[];
  78  |   responseType?: ResponseType;
  79  |   signal?: AbortSignal;
  80  | }
  81  | 
  82  | const delay = (ms: number) =>
  83  |   new Promise((resolve) => {
  84  |     setTimeout(resolve, ms);
  85  |   });
  86  | 
  87  | interface Options {
  88  |   url: string;
  89  |   certificateAuthorities?: Buffer[];
  90  | }
  91  | 
  92  | export class KbnClientRequester {
  93  |   private readonly url: string;
  94  |   private readonly httpsAgent: Https.Agent | null;
  95  | 
  96  |   constructor(private readonly log: ToolingLog, options: Options) {
  97  |     this.url = options.url;
  98  |     this.httpsAgent =
  99  |       Url.parse(options.url).protocol === 'https:'
  100 |         ? new Https.Agent({
  101 |             ca: options.certificateAuthorities,
  102 |             rejectUnauthorized: false,
  103 |           })
  104 |         : null;
  105 |   }
  106 | 
  107 |   private pickUrl() {
  108 |     return this.url;
  109 |   }
  110 | 
  111 |   public resolveUrl(relativeUrl: string = '/') {
  112 |     let baseUrl = this.pickUrl();
  113 |     if (!baseUrl.endsWith('/')) {
  114 |       baseUrl += '/';
  115 |     }
  116 |     const relative = relativeUrl.startsWith('/') ? relativeUrl.slice(1) : relativeUrl;
  117 |     return Url.resolve(baseUrl, relative);
  118 |   }
  119 | 
  120 |   async request<T>(options: ReqOptions): Promise<AxiosResponse<T>> {
  121 |     const url = this.resolveUrl(options.path);
  122 |     const redacted = redactUrl(url);
  123 |     let attempt = 0;
  124 |     const maxAttempts = options.retries ?? DEFAULT_MAX_ATTEMPTS;
  125 |     const msgOrThrow = errMsg({
  126 |       redacted,
  127 |       maxAttempts,
  128 |       requestedRetries: options.retries !== undefined,
  129 |       failedToGetResponseSvc: (error: Error) => isAxiosRequestError(error),
  130 |       ...options,
  131 |     });
  132 | 
  133 |     while (true) {
  134 |       attempt += 1;
  135 |       try {
  136 |         this.log.debug(`Requesting url (redacted): [${redacted}]`);
> 137 |         return await Axios.request(buildRequest(url, this.httpsAgent, options));
      |                ^ AxiosError: Request failed with status code 400
  138 |       } catch (error) {
  139 |         const statusCode = isAxiosResponseError(error) ? error.response.status : 'N/A';
  140 |         const errorCause = error.code || error.message || 'Unknown error';
  141 |         const responseBody = isAxiosResponseError(error)
  142 |           ? JSON.stringify(error.response.data, null, 2)
  143 |           : 'No response body';
  144 |         const errorDetails = `Status: ${statusCode}, Cause: ${errorCause}, Response: ${responseBody}`;
  145 | 
  146 |         this.log.debug(`Request failed - ${errorDetails}, Attempt: ${attempt}/${maxAttempts}`);
  147 | 
  148 |         if (isIgnorableError(error, options.ignoreErrors)) return error.response;
  149 |         if (attempt < maxAttempts) {
  150 |           await delay(1000 * attempt);
  151 |           continue;
  152 |         }
  153 |         throw new KbnClientRequesterError(
  154 |           `${msgOrThrow(attempt, error)} -- ${errorDetails} -- and ran out of retries`,
  155 |           error
  156 |         );
  157 |       }
  158 |     }
  159 |   }
  160 | }
  161 | 
  162 | export function errMsg({
  163 |   redacted,
  164 |   requestedRetries,
  165 |   maxAttempts,
  166 |   failedToGetResponseSvc,
  167 |   path,
  168 |   method,
  169 |   description,
  170 | }: ReqOptions & {
  171 |   redacted: string;
  172 |   maxAttempts: number;
  173 |   requestedRetries: boolean;
  174 |   failedToGetResponseSvc: (x: Error) => boolean;
  175 | }) {
  176 |   return function errMsgOrReThrow(attempt: number, _: any) {
  177 |     const result = isConcliftOnGetError(_)
  178 |       ? `Conflict on GET (path=${path}, attempt=${attempt}/${maxAttempts})`
  179 |       : requestedRetries || failedToGetResponseSvc(_)
  180 |       ? `[${
  181 |           description || `${method} - ${redacted}`
  182 |         }] request failed (attempt=${attempt}/${maxAttempts}): ${_?.code}`
  183 |       : '';
  184 |     if (result === '') throw _;
  185 |     return result;
  186 |   };
  187 | }
  188 | 
  189 | export function redactUrl(_: string): string {
  190 |   const url = new URL(_);
  191 |   return url.password ? `${url.protocol}//${url.host}${url.pathname}` : _;
  192 | }
  193 | 
  194 | export function buildRequest(
  195 |   url: any,
  196 |   httpsAgent: Https.Agent | null,
  197 |   { method, body, query, headers, responseType }: any
  198 | ) {
  199 |   return {
  200 |     method,
  201 |     url,
  202 |     data: body,
  203 |     params: query,
  204 |     headers: {
  205 |       ...headers,
  206 |       'kbn-xsrf': 'kbn-client',
  207 |       'x-elastic-internal-origin': 'kbn-client',
  208 |     },
  209 |     httpsAgent,
  210 |     responseType,
  211 |     // work around https://github.com/axios/axios/issues/2791
  212 |     transformResponse: responseType === 'text' ? [(x: any) => x] : undefined,
  213 |     maxContentLength: 30000000,
  214 |     maxBodyLength: 30000000,
  215 |     paramsSerializer: (params: any) => Qs.stringify(params),
  216 |   };
  217 | }
  218 | 
```