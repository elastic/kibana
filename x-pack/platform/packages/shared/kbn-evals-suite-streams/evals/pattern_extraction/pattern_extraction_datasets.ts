/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ground truth data structure for pattern extraction evaluation.
 *
 * ## Fields Used for Automated Scoring (in pattern_extraction_metrics.ts):
 *
 * - `expected_fields.timestamp.field_name` → calculateTimestampAccuracy()
 * - `expected_fields.log_level.field_name` → calculateLogLevelAccuracy()
 * - `expected_fields.log_level.example_values` → validateLogLevelValues()
 * - `expected_fields.other_fields[].name` → calculateFieldQuality()
 * - `expected_fields.other_fields[].type` → validateFieldType()
 * - `expected_fields.other_fields[].required` → weightRequiredFields()
 * - `pattern_characteristics.expected_min_fields` → calculateFieldCountPenalty()
 * - `pattern_characteristics.expected_max_fields` → calculateFieldCountPenalty()
 *
 * ## Documentation-Only Fields (not used in scoring):
 *
 * - `source_id`, `source_type`, `integration_package` → Metadata
 * - `sample_messages` → Redundant (input already has sample_messages)
 * - `timestamp.format`, `timestamp.example_value` → Human reference
 * - `*.grok_pattern`, `*.dissect_pattern` → Pattern hints
 * - `*.example_values`, `*.description` → Human reference
 * - `pattern_characteristics.should_*`, `delimiter` → Future use
 * - `reference_patterns` → Reference implementation
 */
export interface PatternExtractionGroundTruth {
  // ===========================================
  // METADATA (documentation only)
  // ===========================================
  source_id: string;
  source_type: 'loghub' | 'integration' | 'synthetic';
  integration_package?: string;
  loghub_system?: string;
  sample_messages: string[]; // Usually empty - input has the messages

  // ===========================================
  // EXPECTED FIELDS (used for scoring)
  // ===========================================
  expected_fields: {
    /**
     * USED: field_name checked by calculateTimestampAccuracy()
     * DOC: format, example_value, grok_pattern, dissect_pattern
     */
    timestamp?: {
      field_name: string;
      format?: string;
      example_value?: string;
      grok_pattern?: string;
      dissect_pattern?: string;
    };

    /**
     * USED: field_name + example_values checked by calculateLogLevelAccuracy()
     * DOC: grok_pattern, dissect_pattern
     */
    log_level?: {
      field_name: string;
      example_values: string[];
      grok_pattern?: string;
      dissect_pattern?: string;
    };

    /**
     * USED: name, type, required checked by calculateFieldQuality()
     * DOC: example_values, grok_pattern, dissect_pattern, description
     */
    other_fields: Array<{
      name: string;
      type: 'keyword' | 'number' | 'ip' | 'text' | 'boolean';
      required: boolean;
      example_values?: string[];
      grok_pattern?: string;
      dissect_pattern?: string;
      description?: string;
    }>;
  };

  // ===========================================
  // PATTERN CHARACTERISTICS
  // ===========================================
  /**
   * USED: expected_min_fields, expected_max_fields by calculateFieldCountPenalty()
   * DOC: should_handle_*, delimiter (not currently used)
   */
  pattern_characteristics?: {
    expected_min_fields: number;
    expected_max_fields: number;
    should_handle_multiline?: boolean;
    should_extract_quoted_strings?: boolean;
    should_handle_optional_fields?: boolean;
    delimiter?: string;
  };

  // ===========================================
  // REFERENCE PATTERNS (documentation only)
  // ===========================================
  /**
   * DOC: Reference patterns from official integrations.
   * NOT USED for automated scoring - just for human reference.
   */
  reference_patterns?: {
    grok?: string[];
    dissect?: string;
    source: string;
  };
}

export interface PatternExtractionEvaluationExample {
  input: {
    stream_name: string;
    connector_id: string;
    sample_messages: string[];
    field_to_parse: string; // Usually "body.text" or "message"
  };
  output: PatternExtractionGroundTruth;
  metadata: {
    difficulty: 'easy' | 'medium' | 'hard';
    notes?: string;
  };
}

export interface PatternExtractionEvaluationDataset {
  name: string;
  description: string;
  examples: PatternExtractionEvaluationExample[];
}

/**
 * GROK PATTERN DATASETS
 */
export const GROK_PATTERN_DATASETS: Record<string, PatternExtractionEvaluationDataset> = {
  web_servers: {
    name: 'Web Server Logs - Grok Extraction',
    description: 'Apache and Nginx access and error logs with various formats',
    examples: [
      // 🔧 NEW DATASETS GO HERE - Added by create_dataset_from_clipboard.ts
      // Apache Access Log - Common Log Format
      {
        input: {
          stream_name: 'logs.apache',
          connector_id: '', // Will be filled at runtime
          field_to_parse: 'body.text',
          sample_messages: [
            '::1 - - [26/Dec/2016:16:16:29 +0200] "GET /favicon.ico HTTP/1.1" 404 209',
            '192.168.33.1 - - [26/Dec/2016:16:22:13 +0000] "GET /hello HTTP/1.1" 404 499 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:50.0) Gecko/20100101 Firefox/50.0"',
            '::1 - - [26/Dec/2016:16:16:48 +0200] "-" 408 -',
            '172.17.0.1 - - [29/May/2017:19:02:48 +0000] "GET /stringpatch HTTP/1.1" 404 612 "-" "Mozilla/5.0 (Windows NT 6.1; rv:15.0) Gecko/20120716 Firefox/15.0a2" "-"',
            'monitoring-server - - [29/May/2017:19:02:48 +0000] "GET /status HTTP/1.1" 200 612 "-" "Mozilla/5.0 (Windows NT 6.1; rv:15.0) Gecko/20120716 Firefox/15.0a2" "-"',
            '127.0.0.1 - - [02/Feb/2019:05:38:45 +0100] "-" 408 152 "-" "-"',
            '127.0.0.1 user-identity frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326',
            '89.160.20.112 - - [29/May/2017:19:02:48 +0000] "GET /path HTTP/1.1" 200 612 "-" "Mozilla/5.0 (Windows NT 6.1; rv:15.0) Gecko/20120716 Firefox/15.0a2" X-Forwarded-For="10.0.0.2,10.0.0.1"',
            '2a02:cf40:add:4002:91f2:a9b2:e09a:6fc6 - - [29/May/2017:19:02:48 +0000] "GET /page HTTP/1.1" 200 612 "-" "Mozilla/5.0 (Windows NT 6.1; rv:15.0) Gecko/20120716 Firefox/15.0a2" X-Forwarded-For="10.225.192.17, 10.2.2.121"',
            'monitoring-server - - [17/May/2022:21:41:43 +0000] "GET / HTTP/1.1" 200 45 "-" "curl/7.79.1" X-Forwarded-For="192.168.0.2"',
          ],
        },
        output: {
          source_id: 'apache-access',
          source_type: 'integration',
          integration_package: 'apache',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'dd/MMM/yyyy:HH:mm:ss Z',
              example_value: '26/Dec/2016:16:16:29 +0200',
              grok_pattern: 'HTTPDATE',
            },
            other_fields: [
              {
                name: 'attributes.source.ip',
                type: 'keyword',
                example_values: ['::1', '192.168.33.1', '172.17.0.1', 'monitoring-server'],
                required: true,
                grok_pattern: 'IPORHOST',
                description: 'Client IP address or hostname',
              },
              {
                name: 'attributes.user.name',
                type: 'keyword',
                example_values: ['-', 'frank'],
                required: true,
                description: 'Authenticated user name',
              },
              {
                name: 'attributes.custom.remote_logname',
                type: 'keyword',
                example_values: ['-', 'user-identity'],
                required: true,
                description: 'Remote logname (usually -)',
              },
              {
                name: 'attributes.http.request',
                type: 'keyword',
                example_values: ['GET /favicon.ico HTTP/1.1', 'GET /hello HTTP/1.1', '-'],
                required: true,
                description: 'Full HTTP request line',
              },
              {
                name: 'attributes.http.response.status_code',
                type: 'number',
                example_values: ['404', '200', '408'],
                required: true,
                grok_pattern: 'NUMBER',
                description: 'HTTP status code',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: true,
            expected_min_fields: 5,
            expected_max_fields: 8,
          },
          reference_patterns: {
            grok: [
              '%{IPORHOST:attributes.source.ip} %{DATA:attributes.custom.remote_logname} %{DATA:attributes.user.name} \\[%{HTTPDATE:attributes.custom.timestamp}\\] "%{DATA:attributes.http.request}" %{NUMBER:attributes.http.response.status_code:long} %{GREEDYDATA:body.text}',
            ],
            source: 'Pattern extraction with attributes prefix',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Common Log Format with optional fields (referrer, user-agent, X-Forwarded-For)',
        },
      },
      // Nginx Access Log
      {
        input: {
          stream_name: 'logs.nginx',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '67.43.156.13 - - [25/Oct/2016:14:49:33 +0200] "GET / HTTP/1.1" 200 612 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.59 Safari/537.36"',
            '67.43.156.13 - - [25/Oct/2016:14:49:34 +0200] "GET /favicon.ico HTTP/1.1" 404 571 "http://localhost:8080/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.59 Safari/537.36"',
            '67.43.156.13 - - [25/Oct/2016:14:50:44 +0200] "GET /adsasd HTTP/1.1" 404 571 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.59 Safari/537.36"',
            '67.43.156.13 - - [07/Dec/2016:10:34:43 +0100] "GET / HTTP/1.1" 200 612 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36"',
            '67.43.156.13 - - [07/Dec/2016:10:43:18 +0100] "GET /test HTTP/1.1" 404 571 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36"',
            '127.0.0.1 - - [07/Dec/2016:11:04:37 +0100] "GET /test1 HTTP/1.1" 404 571 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36"',
            '127.0.0.1 - - [07/Dec/2016:11:04:58 +0100] "GET / HTTP/1.1" 304 0 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:49.0) Gecko/20100101 Firefox/49.0"',
            '127.0.0.1 - - [07/Dec/2016:11:05:07 +0100] "GET /taga HTTP/1.1" 404 169 45.324 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:49.0) Gecko/20100101 Firefox/49.0"',
            'lessons.example.com 192.168.0.1 - - [09/Jun/2020:12:10:39 -0700] "GET /path/file.mp4 HTTP/1.1" 206 7648063 "http://lessons.example.com/" "Mozilla/5.0 (Linux; Android 5.1.1; KFFOWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/81.2.16 like Chrome/81.0.4044.138 Safari/537.36"',
          ],
        },
        output: {
          source_id: 'nginx-access',
          source_type: 'integration',
          integration_package: 'nginx',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'dd/MMM/yyyy:HH:mm:ss Z',
              example_value: '25/Oct/2016:14:49:33 +0200',
              grok_pattern: 'HTTPDATE',
            },
            other_fields: [
              {
                name: 'attributes.source.ip',
                type: 'keyword',
                example_values: ['67.43.156.13', '127.0.0.1', 'lessons.example.com'],
                required: true,
                grok_pattern: 'IPORHOST',
              },
              {
                name: 'attributes.user.name',
                type: 'keyword',
                example_values: ['-'],
                required: true,
              },
              {
                name: 'attributes.custom.remote_logname',
                type: 'keyword',
                example_values: ['-'],
                required: true,
              },
              {
                name: 'attributes.http.request',
                type: 'keyword',
                example_values: [
                  'GET / HTTP/1.1',
                  'GET /favicon.ico HTTP/1.1',
                  'GET /taga HTTP/1.1',
                ],
                required: true,
              },
              {
                name: 'attributes.http.response.status_code',
                type: 'number',
                example_values: ['200', '404', '206'],
                required: true,
                grok_pattern: 'NUMBER',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: true,
            expected_min_fields: 5,
            expected_max_fields: 8,
          },
          reference_patterns: {
            grok: [
              '%{IPORHOST:attributes.source.ip} %{DATA:attributes.custom.remote_logname} %{DATA:attributes.user.name} \\[%{HTTPDATE:attributes.custom.timestamp}\\] "%{DATA:attributes.http.request}" %{NUMBER:attributes.http.response.status_code:long} %{GREEDYDATA:body.text}',
            ],
            source: 'Pattern extraction with attributes prefix',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Similar to Apache but with consistent format',
        },
      },
      // Nginx Error Log
      {
        input: {
          stream_name: 'logs.nginx_error',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '2016/10/25 14:49:34 [error] 54053#0: *1 open() "/usr/local/Cellar/nginx/1.10.2_1/html/favicon.ico" failed (2: No such file or directory), client: 127.0.0.1, server: localhost, request: "GET /favicon.ico HTTP/1.1", host: "localhost:8080", referrer: "http://localhost:8080/"',
            '2016/10/25 14:50:44 [error] 54053#0: *3 open() "/usr/local/Cellar/nginx/1.10.2_1/html/adsasd" failed (2: No such file or directory), client: 127.0.0.1, server: localhost, request: "GET /adsasd HTTP/1.1", host: "localhost:8080"',
            '2019/10/30 23:26:34 [error] 205860#205860: *180289 FastCGI sent in stderr: "PHP message: PHP Warning: Declaration error", client: 10.0.0.1, server: example.com, request: "GET /index.php HTTP/1.1"',
            '2019/11/05 14:50:44 [error] 54053#0: *3 open() "/usr/local/Cellar/nginx/1.10.2_1/html/adsasd" failed (2: No such file or directory), client: 127.0.0.1, server: localhost, request: "GET /pysio HTTP/1.1", host: "localhost:8080"',
          ],
        },
        output: {
          source_id: 'nginx-error',
          source_type: 'integration',
          integration_package: 'nginx',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'yyyy/MM/dd H:m:s',
              example_value: '2016/10/25 14:49:34',
              grok_pattern: 'DATA',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['error', 'warn', 'info'],
              grok_pattern: 'LOGLEVEL',
            },
            other_fields: [
              {
                name: 'attributes.process.pid',
                type: 'number',
                example_values: ['54053', '205860'],
                required: true,
                grok_pattern: 'NUMBER',
              },
              {
                name: 'attributes.process.thread.id',
                type: 'number',
                example_values: ['0', '205860'],
                required: true,
                grok_pattern: 'NUMBER',
              },
              {
                name: 'attributes.nginx.error.connection_id',
                type: 'number',
                example_values: ['1', '3', '180289'],
                required: false,
                grok_pattern: 'NUMBER',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: [
                  'open() "/usr/local/Cellar/nginx/1.10.2_1/html/favicon.ico" failed',
                ],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: true,
            expected_min_fields: 5,
            expected_max_fields: 8,
          },
          reference_patterns: {
            grok: [
              '%{DATA:attributes.custom.timestamp} \\[%{DATA:attributes.log.level}\\] %{NUMBER:attributes.process.pid:long}#%{NUMBER:attributes.process.thread.id:long}: (\\*%{NUMBER:attributes.nginx.error.connection_id:long} )?%{GREEDYDATA:body.text}',
            ],
            source: 'Pattern extraction with attributes prefix',
          },
        },
        metadata: {
          difficulty: 'hard',
          notes: 'Complex multi-line error messages with optional connection ID',
        },
      },
      // Apache Tomcat Log
      {
        input: {
          stream_name: 'logs.tomcat',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            'February 26 20:15:08 ctetur5806.api.home %APACHETOMCAT- COOK: 10.156.194.38||gnaali||enatus||[26/Feb/2016:8:15:08 PT]||incid||https://internal.example.com/tetur/idolor.html?ntex=eius#luptat||emape||aer||lupt||tia||7019||https://www.example.com/quis/orisn.txt?anti=ofdeF#metcons||Mozilla/5.0 (Linux; Android 8.1.0; SM-A260G Build/OPR6; rv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Rocket/2.1.17(19420) Chrome/81.0.4044.138 Mobile Safari/537.36||nul',
            'April 24 00:25:25 erep2696.www.home %APACHETOMCAT- INDEX: 10.38.77.13||aquaeab||liqu||[24/Apr/2016:12:25:25 PT]||ehend||https://www5.example.net/uidolore/niamqu.gif?iat=tevelit#nsequat||loremagn||ipis||gelits||tatevel||3856||https://api.example.com/uovol/dmi.txt?quunt=ptat#ore||Mozilla/5.0 (Linux; Android 4.1.2; Micromax P410i Build/JZO54K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.111 Mobile Safari/537.36||tsed',
            'May 8 07:27:59 mUt2398.invalid %APACHETOMCAT- DEBUG: 10.11.201.109||boree||ugits||[08/May/2016:7:27:59 CEST]||iinea||https://www.example.org/idexea/riat.txt?tvol=moll#tatione||inB||deomni||tquovol||ntsuntin||3341||https://mail.example.org/imav/ididu.htm?tion=orsitame#quiratio||Mozilla/5.0 (Linux; Android 6.0; Lenovo A2016a40 Build/MRA58K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.106 Mobile Safari/537.36 YaApp_Android/10.30 YaSearchBrowser/10.30||iam',
            'June 20 04:35:42 siuta2896.www.localhost %APACHETOMCAT- SEARCH: 10.72.114.23||enia||nsequu||[20/Jun/2016:4:35:42 PST]||rsint||https://example.com/idestla/Nemoeni.htm?taed=lup#remeumf||antiumto||strude||ctetura||usmod||1640||https://mail.example.net/lor/fugit.jpg?rsitamet=lupt#xea||Mozilla/5.0 (Linux; Android 6.0; ZTE BLADE V7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.83 Mobile Safari/537.36||orain',
            'July 4 11:38:16 oin6316.www5.host %APACHETOMCAT- TRACE: 10.129.241.147||lores||lapariat||[04/Jul/2016:11:38:16 PST]||etc||https://example.net/nimadmin/ditautfu.html?lpa=entsu#dun||onproide||luptat||itaut||imaven||152||https://internal.example.net/onproide/Nemoen.gif?pitla=ccu#urE||Mozilla/5.0 (Linux; Android 10; ASUS_X01BDA) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36||inculpaq',
            'July 18 18:40:50 tionemu7691.www.local %APACHETOMCAT- BDMTHD: 10.185.101.76||errorsi||des||[18/Jul/2016:6:40:50 GMT+02:00]||stl||https://www5.example.com/ono/stru.jpg?emaperi=tame#tinvol||tectobe||colabor||iusmodt||etdolo||3768||https://internal.example.net/ommod/sequatur.txt?tlabo=suntexp#ugiatnu||Mozilla/5.0 (Linux; Android 5.1.1; Android Build/LMY47V) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36 YaApp_Android/9.80 YaSearchBrowser/9.80||itecto',
            'August 30 15:48:33 conse2991.internal.lan %APACHETOMCAT- FGET: 10.116.104.101||gnam||tat||[30/Aug/2016:3:48:33 CET]||lumqui||https://internal.example.net/mdolore/rQuisau.gif?iavolu=den#tutla||olorema||iades||siarchi||datatn||5076||https://internal.example.net/mipsumd/eFinib.jpg?remi=saute#ercit||Mozilla/5.0 (Linux; Android 9; Notepad_K10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.83 Safari/537.36||remagn',
            'September 28 05:53:42 wri2784.api.domain %APACHETOMCAT- PUT: 10.153.111.103||itquiin||modocon||[28/Sep/2016:5:53:42 PST]||taevit||https://www5.example.com/etconse/tincu.txt?lit=asun#estia||eaq||occae||ctetura||labore||4621||https://www.example.com/adeseru/emoe.html?atur=itanimi#itame||Mozilla/5.0 (Linux; U; Android 4.0.3; es-us; GT-P3100 Build/IML74K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30||rehender',
            'October 26 19:58:50 oquisqu2937.mail.domain %APACHETOMCAT- BDMTHD: 10.209.182.237||tper||olor||[26/Oct/2016:7:58:50 GMT-07:00]||osqui||https://www.example.org/iutali/fdeFi.jpg?liquide=etdol#uela||boN||eprehend||aevit||aboN||3423||https://example.net/tlabo/uames.gif?mpo=offi#giatnu||Mozilla/5.0 (iPhone; CPU iPhone OS 13_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LightSpeed [FBAN/MessengerLiteForiOS;FBAV/266.0.0.32.114;FBBV/216059178;FBDV/iPhone10,6;FBMD/iPhone;FBSN/iOS;FBSV/13.4.1;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/0]||lor',
            '%APACHETOMCAT-1516-asdf: 10.251.224.219||eacommod||rci||[29/Jan/2016:6:09:59 OMST]||exercita||https://example.com/illumqui/ventore.html?min=ite#utl||vol||amremap||oremi||ntsunti||5293||https://mail.example.net/turadipi/aeca.htm?ntium=psaq#cer||Mozilla/5.0 (Linux; Android 9; G8142) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.83 Mobile Safari/537.36||aliqu',
          ],
        },
        output: {
          source_id: 'tomcat',
          source_type: 'integration',
          integration_package: 'tomcat',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'dd-MMM-yyyy HH:mm:ss.SSS',
              example_value: '15-Jan-2023 10:30:45.123',
              grok_pattern: 'DATA',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['INFO', 'WARNING', 'SEVERE', 'FINE'],
              grok_pattern: 'WORD',
            },
            other_fields: [
              {
                name: 'attributes.process.thread.name',
                type: 'keyword',
                example_values: ['main', 'http-nio-8080-exec-1'],
                required: true,
                grok_pattern: 'DATA',
              },
              {
                name: 'attributes.log.logger',
                type: 'keyword',
                example_values: ['org.apache.catalina.startup.Catalina.start'],
                required: true,
                grok_pattern: 'JAVACLASS',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: ['Server startup in 1234 ms'],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: false,
            expected_min_fields: 5,
            expected_max_fields: 7,
          },
          reference_patterns: {
            grok: [
              '%{DATA:@timestamp} %{WORD:log.level} \\[%{DATA:process.thread.name}\\] %{JAVACLASS:log.logger} %{GREEDYDATA:message}',
            ],
            source: 'Tomcat integration log pipeline',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Tomcat logs with thread names and Java class hierarchies',
        },
      },
    ],
  },

  databases: {
    name: 'Database Logs - Grok Extraction',
    description: 'MongoDB, MySQL, PostgreSQL, Redis database logs',
    examples: [
      // PostgreSQL Log
      {
        input: {
          stream_name: 'logs.postgresql',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            "2019-09-22 06:28:24 UTC LOG:  duration: 112.337 ms  execute S_59: UPDATE qrtz_TRIGGERS SET TRIGGER_STATE = $1 WHERE SCHED_NAME = 'Scheduler_1' AND TRIGGER_NAME = $2",
            "2019-09-22 06:28:24 UTC DETAIL:  parameters: $1 = 'ACQUIRED', $2 = 'surveyInvitation_3Prbn85DiBWe8wHa_158802_77133_1260104', $3 = 'ExecutorsService'",
            "2019-09-22 06:28:24 UTC LOG:  duration: 2474.307 ms  execute S_30: SELECT * FROM qrtz_LOCKS WHERE SCHED_NAME = 'Scheduler_1' AND LOCK_NAME = $1 FOR UPDATE",
            '2019-09-22 06:28:24 UTC ERROR:  relation "users" does not exist at character 15',
          ],
        },
        output: {
          source_id: 'postgresql',
          source_type: 'integration',
          integration_package: 'postgresql',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'yyyy-MM-dd HH:mm:ss z',
              example_value: '2019-09-22 06:28:24 UTC',
              grok_pattern: 'TIMESTAMP_ISO8601',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['LOG', 'ERROR', 'WARNING', 'DETAIL', 'INFO'],
              grok_pattern: 'WORD',
            },
            other_fields: [
              {
                name: 'body.text',
                type: 'text',
                example_values: ['duration: 112.337 ms  execute S_59: UPDATE qrtz_TRIGGERS'],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: true,
            expected_min_fields: 3,
            expected_max_fields: 8,
          },
          reference_patterns: {
            grok: [
              '%{TIMESTAMP_ISO8601:@timestamp} %{DATA:timezone} %{WORD:log.level}:  %{GREEDYDATA:message}',
            ],
            source: 'PostgreSQL integration log pipeline',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'PostgreSQL logs with duration tracking and SQL queries',
        },
      },
      // MySQL Slow Query Log
      {
        input: {
          stream_name: 'logs.mysql_slowlog',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '# Time: 2019-03-24T14:01:47.811234Z',
            '# User@Host: root[root] @ localhost []  Id:    14',
            '# Query_time: 2.475469  Lock_time: 0.000287 Rows_sent: 10  Rows_examined: 314571',
            'SET timestamp=1553436105;',
            'SELECT last_name, MAX(salary) AS salary FROM employees INNER JOIN salaries ON employees.emp_no = salaries.emp_no GROUP BY last_name ORDER BY salary DESC LIMIT 10;',
          ],
        },
        output: {
          source_id: 'mysql-slowlog',
          source_type: 'integration',
          integration_package: 'mysql',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: "yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'",
              example_value: '2019-03-24T14:01:47.811234Z',
              grok_pattern: 'TIMESTAMP_ISO8601',
            },
            other_fields: [
              {
                name: 'attributes.user.name',
                type: 'keyword',
                example_values: ['root'],
                required: false,
              },
              {
                name: 'attributes.source.domain',
                type: 'keyword',
                example_values: ['localhost'],
                required: false,
              },
              {
                name: 'attributes.mysql.slowlog.query_time.sec',
                type: 'number',
                example_values: ['2.475469', '2.631844'],
                required: false,
                grok_pattern: 'NUMBER',
              },
              {
                name: 'attributes.mysql.slowlog.lock_time.sec',
                type: 'number',
                example_values: ['0.000287', '0.000145'],
                required: false,
                grok_pattern: 'NUMBER',
              },
              {
                name: 'attributes.mysql.slowlog.rows_sent',
                type: 'number',
                example_values: ['10'],
                required: false,
                grok_pattern: 'NUMBER',
              },
              {
                name: 'attributes.mysql.slowlog.rows_examined',
                type: 'number',
                example_values: ['314571'],
                required: false,
                grok_pattern: 'NUMBER',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: ['SELECT last_name, MAX(salary) AS salary FROM employees'],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: true,
            expected_min_fields: 4,
            expected_max_fields: 10,
          },
          reference_patterns: {
            grok: [
              '# Time: %{TIMESTAMP_ISO8601:@timestamp}',
              '# User@Host: %{USER:user.name}\\[%{USER}\\] @ %{HOSTNAME:source.domain}',
              '# Query_time: %{NUMBER:mysql.slowlog.query_time.sec}  Lock_time: %{NUMBER:mysql.slowlog.lock_time.sec} Rows_sent: %{NUMBER:mysql.slowlog.rows_sent}  Rows_examined: %{NUMBER:mysql.slowlog.rows_examined}',
            ],
            source: 'MySQL integration slowlog pipeline',
          },
        },
        metadata: {
          difficulty: 'hard',
          notes: 'Multi-line slow query log with performance metrics',
        },
      },
      // Redis Log
      {
        input: {
          stream_name: 'logs.redis',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '26571:M 27 Dec 2018 11:19:18.874 * Synchronization with replica 10.114.208.18:6023 succeeded',
            '4961:M 30 May 12:50:13.457 * Increased maximum number of open files to 10032 (it was originally set to 4864).',
            '4961:M 30 May 12:50:13.463 # Server started, Redis version 3.0.2',
            '4961:M 30 May 12:50:13.464 * DB loaded from disk: 0.001 seconds',
            '4961:M 30 May 12:50:13.464 * The server is now ready to accept connections on port 6379',
            '4961:M 30 May 12:52:41.448 # User requested shutdown...',
            '4961:M 30 May 12:52:41.448 * Saving the final RDB snapshot before exiting.',
            '4961:M 30 May 12:52:41.452 * DB saved on disk',
            '4961:M 30 May 12:52:41.452 # Redis is now ready to exit, bye bye...',
            '5092:M 30 May 12:52:42.131 * Increased maximum number of open files to 10032 (it was originally set to 4864).',
          ],
        },
        output: {
          source_id: 'redis',
          source_type: 'integration',
          integration_package: 'redis',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'dd MMM yyyy HH:mm:ss.SSS',
              example_value: '27 Dec 2018 11:19:18.874',
              grok_pattern: 'DATA',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['*', '#', '.', '-'],
              grok_pattern: 'DATA',
            },
            other_fields: [
              {
                name: 'attributes.process.pid',
                type: 'number',
                example_values: ['26571'],
                required: true,
                grok_pattern: 'NUMBER',
              },
              {
                name: 'attributes.redis.log.role',
                type: 'keyword',
                example_values: ['M', 'S', 'C'],
                required: true,
                grok_pattern: 'WORD',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: ['Synchronization with replica 10.114.208.18:6023 succeeded'],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: false,
            expected_min_fields: 5,
            expected_max_fields: 7,
          },
          reference_patterns: {
            grok: [
              '%{NUMBER:process.pid}:%{WORD:redis.log.role} %{DATA:@timestamp} %{DATA:log.level} %{GREEDYDATA:message}',
            ],
            source: 'Redis integration log pipeline',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Redis logs with process ID, role indicator, and log level symbols',
        },
      },
      // MongoDB Log
      {
        input: {
          stream_name: 'logs.mongodb',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '2023-01-15T10:30:45.123+0000 I  NETWORK  [conn123] received client metadata from 192.168.1.100:54321 conn123: { driver: { name: "nodejs", version: "4.12.0" }, os: { type: "Linux", name: "linux", architecture: "x64", version: "5.10.0" } }',
            '2023-01-15T10:30:46.234+0000 I  COMMAND  [conn124] command admin.$cmd command: isMaster { ismaster: 1 } numYields:0 reslen:189 locks:{} 0ms',
            '2023-01-15T10:30:47.345+0000 W  WRITE    [conn125] Slow query taking 1024ms: { find: "users", filter: { age: { $gt: 18 } } }',
            '2023-01-15T10:30:48.456+0000 E  STORAGE  [conn126] Error occurred during write: DiskFull',
          ],
        },
        output: {
          source_id: 'mongodb',
          source_type: 'integration',
          integration_package: 'mongodb',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
              example_value: '2023-01-15T10:30:45.123+0000',
              grok_pattern: 'TIMESTAMP_ISO8601',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['I', 'W', 'E', 'D', 'F'],
              grok_pattern: 'WORD',
            },
            other_fields: [
              {
                name: 'attributes.mongodb.log.component',
                type: 'keyword',
                example_values: ['NETWORK', 'COMMAND', 'WRITE', 'STORAGE'],
                required: true,
                grok_pattern: 'WORD',
              },
              {
                name: 'attributes.mongodb.log.context',
                type: 'keyword',
                example_values: ['conn123', 'conn124'],
                required: false,
                grok_pattern: 'DATA',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: ['received client metadata from 192.168.1.100:54321'],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: true,
            expected_min_fields: 4,
            expected_max_fields: 8,
          },
          reference_patterns: {
            grok: [
              '%{TIMESTAMP_ISO8601:@timestamp} %{WORD:log.level}  %{WORD:mongodb.log.component}  \\[%{DATA:mongodb.log.context}\\] %{GREEDYDATA:message}',
            ],
            source: 'MongoDB integration log pipeline',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'MongoDB logs with component and context identifiers',
        },
      },
    ],
  },

  big_data: {
    name: 'Big Data Systems - Grok Extraction',
    description: 'HDFS, Hadoop, Spark, Zookeeper logs from distributed systems',
    examples: [
      // Apache Spark Log
      {
        input: {
          stream_name: 'logs.spark',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '23/01/15 10:30:45 INFO DAGScheduler: Got job 0 (collect at SparkPlan.scala:139) with 1 output partitions',
            '23/01/15 10:30:46 WARN TaskSetManager: Lost task 1.0 in stage 0.0 (TID 1, worker-01, executor 1): java.io.IOException: Connection refused',
            '23/01/15 10:30:47 ERROR Executor: Exception in task 2.0 in stage 0.0 (TID 2)',
            '23/01/15 10:30:48 DEBUG BlockManager: Found block rdd_1_0 locally',
            '23/01/15 10:30:49 INFO MemoryStore: Block rdd_1_0 stored as values in memory (estimated size 2.4 MB, free 1.5 GB)',
            '23/01/15 10:30:50 WARN HeartbeatReceiver: Removing executor 2 with no recent heartbeats: 120000 ms exceeds timeout 60000 ms',
            '23/01/15 10:30:51 INFO DAGScheduler: ResultStage 3 (collect at StackTrace.scala:44) finished in 0.315 s',
            '23/01/15 10:30:52 INFO TaskSchedulerImpl: Removed TaskSet 1.0, whose tasks have all completed, from pool',
            '23/01/15 10:30:53 ERROR Utils: Aborting task java.lang.OutOfMemoryError: Java heap space',
            '23/01/15 10:30:54 INFO SparkContext: Successfully stopped SparkContext',
          ],
        },
        output: {
          source_id: 'spark',
          source_type: 'loghub',
          integration_package: '',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'yy/MM/dd HH:mm:ss',
              example_value: '23/01/15 10:30:45',
              grok_pattern: 'DATA',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['INFO', 'WARN', 'ERROR', 'DEBUG'],
              grok_pattern: 'LOGLEVEL',
            },
            other_fields: [
              {
                name: 'attributes.log.logger',
                type: 'keyword',
                example_values: ['DAGScheduler', 'TaskSetManager', 'Executor', 'BlockManager'],
                required: true,
                grok_pattern: 'JAVACLASS',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: [
                  'Got job 0 (collect at SparkPlan.scala:139) with 1 output partitions',
                ],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: false,
            expected_min_fields: 4,
            expected_max_fields: 6,
          },
          reference_patterns: {
            grok: [
              '%{DATA:@timestamp} %{LOGLEVEL:log.level} %{JAVACLASS:log.logger}: %{GREEDYDATA:message}',
            ],
            source: 'LogHub Spark parser',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Spark logs with Java class loggers and standard log4j format',
        },
      },
      // Hadoop/HDFS Log
      {
        input: {
          stream_name: 'logs.hdfs',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '081109 203615 143 INFO dfs.DataNode$DataXceiver: Receiving block blk_38865049199080 src: /10.251.73.220:54106 dest: /10.251.73.220:50010',
            '081109 203615 145 WARN dfs.DataNode$PacketResponder: PacketResponder 1 for block blk_38865049199080 terminating',
            '081109 203616 147 ERROR dfs.DataNode$DataXceiver: DataXceiver: java.io.IOException: Broken pipe',
            '081109 203617 148 INFO dfs.FSNamesystem: BLOCK* NameSystem.addStoredBlock: blockMap updated',
            '081109 203618 151 INFO dfs.DataNode$PacketResponder: Received block blk_-1608999687919862906 of size 67108864 from /10.251.42.84',
            '081109 203619 153 WARN dfs.DataNode$DataXceiver: Got exception while serving blk_-1608999687919862906 to /10.251.42.84: java.net.SocketTimeoutException: 69000 millis timeout',
            '081109 203620 156 INFO dfs.DataNode$BlockReceiver: Receiving empty packet for block blk_-1608999687919862906',
            '081109 203621 158 INFO dfs.FSNamesystem: BLOCK* NameSystem.delete: blk_-1608999687919862906 is added to invalidSet of 10.251.73.220:50010',
            '081109 203622 160 ERROR dfs.DataNode$DataXceiver: DataXceiver error processing unknown operation  src: /10.251.42.84:48931 dst: /10.251.73.220:50010',
            '081109 203623 162 INFO dfs.DataBlockScanner: Verification succeeded for blk_-1608999687919862906',
          ],
        },
        output: {
          source_id: 'hdfs',
          source_type: 'loghub',
          integration_package: '',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'yyMMdd HHmmss SSS',
              example_value: '081109 203615 143',
              grok_pattern: 'DATA',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['INFO', 'WARN', 'ERROR'],
              grok_pattern: 'LOGLEVEL',
            },
            other_fields: [
              {
                name: 'attributes.log.logger',
                type: 'keyword',
                example_values: ['dfs.DataNode$DataXceiver', 'dfs.FSNamesystem'],
                required: true,
                grok_pattern: 'DATA',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: ['Receiving block blk_38865049199080'],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: false,
            expected_min_fields: 4,
            expected_max_fields: 6,
          },
          reference_patterns: {
            grok: [
              '%{DATA:@timestamp} %{LOGLEVEL:log.level} %{DATA:log.logger}: %{GREEDYDATA:message}',
            ],
            source: 'LogHub HDFS parser',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'HDFS logs with compact timestamp format and Java-style class names',
        },
      },
      // Zookeeper Log
      {
        input: {
          stream_name: 'logs.zookeeper',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '2023-01-15 10:30:45,123 [myid:1] - INFO  [WorkerReceiver[myid=1]:FastLeaderElection@849] - Notification: 1 (message format version), 1 (n.leader), 0x500000003 (n.zxid), 0x1 (n.round), LOOKING (n.state), 1 (n.sid), 0x5 (n.peerEpoch) FOLLOWING (my state)',
            '2023-01-15 10:30:46,234 [myid:1] - WARN  [CommitProcessor:1:NIOServerCnxn@368] - caught end of stream exception',
            '2023-01-15 10:30:47,345 [myid:1] - ERROR [SyncThread:0:FileTxnLog@265] - Failed to write transaction to log',
            '2023-01-15 10:30:48,456 [myid:1] - INFO  [SessionTracker:ZooKeeperServer@358] - Expiring session 0x14a9f8c0e5e0001, timeout of 4000ms exceeded',
            '2023-01-15 10:30:49,567 [myid:1] - INFO  [NIOServerCxn.Factory:0.0.0.0/0.0.0.0:2181:NIOServerCnxnFactory@197] - Accepted socket connection from /10.1.1.100:51234',
            '2023-01-15 10:30:50,678 [myid:1] - WARN  [NIOServerCxn.Factory:0.0.0.0/0.0.0.0:2181:NIOServerCnxn@357] - Exception causing close of session 0x0: ZooKeeperServer not running',
            '2023-01-15 10:30:51,789 [myid:1] - INFO  [QuorumPeer[myid=1]/0.0.0.0:2181:QuorumPeer@784] - LOOKING',
            '2023-01-15 10:30:52,890 [myid:1] - INFO  [QuorumPeer[myid=1]/0.0.0.0:2181:Leader@59] - LEADING - LEADER ELECTION TOOK - 152',
            '2023-01-15 10:30:53,901 [myid:1] - ERROR [LearnerHandler-/10.1.1.101:2888:LearnerHandler@579] - Cannot open channel to 2 at election address /10.1.1.101:3888: Connection refused',
            '2023-01-15 10:30:54,012 [myid:1] - INFO  [SyncThread:0:FileTxnLog@199] - Creating new log file: log.100000001',
          ],
        },
        output: {
          source_id: 'zookeeper',
          source_type: 'loghub',
          integration_package: '',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'yyyy-MM-dd HH:mm:ss,SSS',
              example_value: '2023-01-15 10:30:45,123',
              grok_pattern: 'TIMESTAMP_ISO8601',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['INFO', 'WARN', 'ERROR'],
              grok_pattern: 'LOGLEVEL',
            },
            other_fields: [
              {
                name: 'attributes.zookeeper.myid',
                type: 'keyword',
                example_values: ['1'],
                required: false,
                grok_pattern: 'NUMBER',
              },
              {
                name: 'attributes.zookeeper.thread',
                type: 'keyword',
                example_values: ['WorkerReceiver[myid=1]', 'CommitProcessor:1'],
                required: false,
                grok_pattern: 'DATA',
              },
              {
                name: 'attributes.log.logger',
                type: 'keyword',
                example_values: ['FastLeaderElection', 'NIOServerCnxn', 'FileTxnLog'],
                required: true,
                grok_pattern: 'DATA',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: ['Notification: 1 (message format version)'],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: true,
            expected_min_fields: 4,
            expected_max_fields: 8,
          },
          reference_patterns: {
            grok: [
              '%{TIMESTAMP_ISO8601:@timestamp} \\[myid:%{NUMBER:zookeeper.myid}\\] - %{LOGLEVEL:log.level}  \\[%{DATA:zookeeper.thread}:%{DATA:log.logger}@%{NUMBER}\\] - %{GREEDYDATA:message}',
            ],
            source: 'LogHub Zookeeper parser',
          },
        },
        metadata: {
          difficulty: 'hard',
          notes: 'Complex Zookeeper format with myid, thread names, and class references',
        },
      },
    ],
  },

  security: {
    name: 'Security Logs - Grok Extraction',
    description: 'Firewall, IDS/IPS, and security appliance logs',
    examples: [
      // OpenSSH Authentication Log
      {
        input: {
          stream_name: 'logs.openssh',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            'Jun 14 15:16:01 server sshd[20953]: Accepted publickey for user1 from 10.0.0.1 port 32768 ssh2: RSA SHA256:abcdefg123456',
            'Jun 14 15:16:02 server sshd[20954]: Failed password for invalid user admin from 192.168.1.100 port 54321',
            'Jun 14 15:16:03 server sshd[20955]: Connection closed by authenticating user root 10.0.0.2 port 22 [preauth]',
            'Jun 14 15:16:04 server sshd[20956]: Received disconnect from 172.16.0.5 port 4567:11: Bye Bye [preauth]',
            'Jun 14 15:16:05 server sshd[20957]: Accepted password for user2 from 10.1.1.50 port 41234 ssh2',
            'Jun 14 15:16:06 server sshd[20958]: pam_unix(sshd:session): session opened for user user3 by (uid=0)',
            'Jun 14 15:16:07 server sshd[20959]: Connection closed by 192.168.1.200 port 51000 [preauth]',
            'Jun 14 15:16:08 server sshd[20960]: Did not receive identification string from 10.0.0.100',
            'Jun 14 15:16:09 server sshd[20961]: Invalid user test from 192.168.1.150 port 33333',
            'Jun 14 15:16:10 server sshd[20962]: pam_unix(sshd:session): session closed for user user3',
          ],
        },
        output: {
          source_id: 'openssh',
          source_type: 'loghub',
          integration_package: '',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'MMM d HH:mm:ss',
              example_value: 'Jun 14 15:16:01',
              grok_pattern: 'SYSLOGTIMESTAMP',
            },
            other_fields: [
              {
                name: 'attributes.host.name',
                type: 'keyword',
                example_values: ['server'],
                required: true,
                grok_pattern: 'HOSTNAME',
              },
              {
                name: 'attributes.process.name',
                type: 'keyword',
                example_values: ['sshd'],
                required: true,
                grok_pattern: 'PROG',
              },
              {
                name: 'attributes.process.pid',
                type: 'number',
                example_values: ['20953', '20954', '20955'],
                required: true,
                grok_pattern: 'NUMBER',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: ['Accepted publickey for user1 from 10.0.0.1 port 32768'],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: false,
            expected_min_fields: 5,
            expected_max_fields: 8,
          },
          reference_patterns: {
            grok: [
              '%{SYSLOGTIMESTAMP:@timestamp} %{HOSTNAME:host.name} %{PROG:process.name}\\[%{NUMBER:process.pid:long}\\]: %{GREEDYDATA:message}',
            ],
            source: 'LogHub OpenSSH parser',
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Standard syslog format for SSH authentication events',
        },
      },
    ],
  },

  system_logs: {
    name: 'System Logs - Grok Extraction',
    description: 'Linux and system-level logs',
    examples: [
      // Linux Syslog
      {
        input: {
          stream_name: 'logs.syslog',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            'Dec 13 11:35:28 a-mac-with-esc-key GoogleSoftwareUpdateAgent[21412]: 2016-12-13 11:35:28.420 GoogleSoftwareUpdateAgent[21412/0x700007399000] [lvl=2] -[KSAgentApp updateProductWithProductID:usingEngine:] Checking for updates for "All Products" using engine',
            "Dec 13 11:35:28 a-mac-with-esc-key GoogleSoftwareUpdateAgent[21412]: 2016-12-13 11:35:28.421 GoogleSoftwareUpdateAgent[21412/0x700007399000] [lvl=2] -[KSUpdateEngine updateAllExceptProduct:] KSUpdateEngine updating all installed products, except:'com.google.Keystone'.",
            'Jan 15 10:30:45 server01 systemd[1]: Started Session 123 of user root.',
            'Jan 15 10:30:46 server01 kernel: [12345.678] Out of memory: Kill process 9876 (chrome) score 850 or sacrifice child',
            'Jan 15 10:30:47 server01 NetworkManager[1234]: <info>  [1673780947.123] dhcp4 (eth0): state changed bound -> renew',
            'Jan 15 10:30:48 server01 cron[5678]: (root) CMD (run-parts /etc/cron.hourly)',
            'Jan 15 10:30:49 server01 systemd-logind[891]: New session 45 of user alice.',
            'Jan 15 10:30:50 server01 dockerd[1567]: time="2023-01-15T10:30:50.123456789Z" level=info msg="starting up"',
            'Jan 15 10:30:51 server01 rsyslogd: [origin software="rsyslogd" swVersion="8.2001.0"] rsyslogd was HUPed',
            'Jan 15 10:30:52 server01 systemd[1]: Stopping System Logging Service...',
          ],
        },
        output: {
          source_id: 'linux-syslog',
          source_type: 'loghub',
          integration_package: '',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'MMM dd HH:mm:ss',
              example_value: 'Jan 15 10:30:45',
              grok_pattern: 'SYSLOGTIMESTAMP',
            },
            other_fields: [
              {
                name: 'attributes.host.name',
                type: 'keyword',
                example_values: ['server01'],
                required: true,
                grok_pattern: 'HOSTNAME',
              },
              {
                name: 'attributes.process.name',
                type: 'keyword',
                example_values: ['systemd', 'kernel', 'NetworkManager', 'cron'],
                required: true,
                grok_pattern: 'PROG',
              },
              {
                name: 'attributes.process.pid',
                type: 'number',
                example_values: ['1', '1234', '5678'],
                required: false,
                grok_pattern: 'NUMBER',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: ['Started Session 123 of user root.'],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: true,
            expected_min_fields: 4,
            expected_max_fields: 7,
          },
          reference_patterns: {
            grok: [
              '%{SYSLOGTIMESTAMP:@timestamp} %{HOSTNAME:host.name} %{PROG:process.name}(\\[%{NUMBER:process.pid:long}\\])?: %{GREEDYDATA:message}',
            ],
            source: 'LogHub Linux parser',
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Standard Linux syslog format with optional process ID',
        },
      },
      // Linux Auth.log (Security)
      {
        input: {
          stream_name: 'logs.auth',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            'Feb  9 21:19:40 precise32 sshd[8317]: subsystem request for sftp by user vagrant',
            'Feb  9 21:19:40 precise32 sudo:  vagrant : TTY=pts/0 ; PWD=/home/vagrant ; USER=root ; COMMAND=/bin/sh -c echo BECOME-SUCCESS-lhspyyxxlfzpytwsebjoegenjxyjombo',
            'Feb  9 21:19:40 precise32 sudo: pam_unix(sudo:session): session opened for user root by vagrant(uid=1000)',
            'Feb  9 21:19:41 precise32 sudo: pam_unix(sudo:session): session closed for user root',
            'Feb 22 10:49:54 precise32 sshd[3007]: Accepted publickey for vagrant from 10.0.2.2 port 52059 ssh2',
            'Feb 22 10:49:54 precise32 sshd[3007]: pam_unix(sshd:session): session opened for user vagrant by (uid=0)',
            'Feb 22 10:50:01 precise32 sudo:  vagrant : TTY=pts/0 ; PWD=/home/vagrant ; USER=root ; COMMAND=/usr/bin/vi /etc/apt/sources.list.d/elastic.list',
            'Feb 22 10:50:17 precise32 sudo:  vagrant : TTY=pts/0 ; PWD=/home/vagrant ; USER=root ; COMMAND=/usr/bin/apt-get update',
            'Feb 22 10:26:52 precise32 sshd[1332]: Received disconnect from 10.0.2.2: 11: disconnected by user',
            'Feb 22 10:26:52 precise32 sshd[1317]: pam_unix(sshd:session): session closed for user vagrant',
          ],
        },
        output: {
          source_id: 'linux-auth',
          source_type: 'synthetic',
          integration_package: '',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'MMM dd HH:mm:ss',
              example_value: 'Jan 15 10:30:45',
              grok_pattern: 'SYSLOGTIMESTAMP',
            },
            other_fields: [
              {
                name: 'attributes.host.name',
                type: 'keyword',
                example_values: ['server01'],
                required: true,
                grok_pattern: 'HOSTNAME',
              },
              {
                name: 'attributes.process.name',
                type: 'keyword',
                example_values: ['sudo', 'sshd', 'su'],
                required: true,
                grok_pattern: 'PROG',
              },
              {
                name: 'attributes.process.pid',
                type: 'number',
                example_values: ['12345'],
                required: false,
                grok_pattern: 'NUMBER',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: ['alice : TTY=pts/1 ; PWD=/home/alice'],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: true,
            expected_min_fields: 4,
            expected_max_fields: 7,
          },
          reference_patterns: {
            grok: [
              '%{SYSLOGTIMESTAMP:@timestamp} %{HOSTNAME:host.name} %{PROG:process.name}(\\[%{NUMBER:process.pid:long}\\])?: %{GREEDYDATA:message}',
            ],
            source: 'Synthetic based on Linux auth.log',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Authentication and authorization logs with user/command details',
        },
      },
    ],
  },

  messaging: {
    name: 'Message Queue Logs - Grok Extraction',
    description: 'Kafka, RabbitMQ, and message broker logs',
    examples: [
      // RabbitMQ Log
      {
        input: {
          stream_name: 'logs.rabbitmq',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '2023-01-15 10:30:45.123 [info] <0.567.0> accepting AMQP connection <0.567.0> (192.168.1.100:54321 -> 172.17.0.2:5672)',
            '2023-01-15 10:30:46.234 [warning] <0.568.0> closing AMQP connection <0.568.0> (192.168.1.101:54322 -> 172.17.0.2:5672): missed heartbeats from client, timeout: 60s',
            '2023-01-15 10:30:47.345 [error] <0.569.0> Error on AMQP connection <0.569.0>: {handshake_timeout,frame_header}',
            "2023-01-15 10:30:48.456 [info] <0.570.0> connection <0.570.0> (192.168.1.102:54323 -> 172.17.0.2:5672): user 'guest' authenticated and granted access to vhost '/'",
            '2023-01-15 10:30:49.567 [notice] <0.571.0> Server startup complete; 4 plugins started.',
            '2023-01-15 10:30:50.678 [info] <0.572.0> Memory high watermark set to 6439 MiB (6751 MiB total) by vm_memory_high_watermark',
            '2023-01-15 10:30:51.789 [warning] <0.573.0> Missed heartbeats from client, timeout: 60s',
            '2023-01-15 10:30:52.890 [info] <0.574.0> accepting AMQP connection <0.574.0> (10.1.1.50:44444 -> 172.17.0.2:5672)',
            '2023-01-15 10:30:53.901 [error] <0.575.0> Channel error on connection <0.575.0> (10.1.1.51:44445 -> 172.17.0.2:5672), channel 1: operation basic.publish caused a channel exception not_found',
            "2023-01-15 10:30:54.012 [info] <0.576.0> closing AMQP connection <0.576.0> (10.1.1.52:44446 -> 172.17.0.2:5672, vhost: '/', user: 'admin')",
          ],
        },
        output: {
          source_id: 'rabbitmq',
          source_type: 'integration',
          integration_package: 'rabbitmq',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'yyyy-MM-dd HH:mm:ss.SSS',
              example_value: '2023-01-15 10:30:45.123',
              grok_pattern: 'TIMESTAMP_ISO8601',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['info', 'warning', 'error'],
              grok_pattern: 'LOGLEVEL',
            },
            other_fields: [
              {
                name: 'attributes.process.pid',
                type: 'keyword',
                example_values: ['<0.567.0>', '<0.568.0>'],
                required: true,
                grok_pattern: 'DATA',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: ['accepting AMQP connection'],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: false,
            expected_min_fields: 4,
            expected_max_fields: 6,
          },
          reference_patterns: {
            grok: [
              '%{TIMESTAMP_ISO8601:@timestamp} \\[%{LOGLEVEL:log.level}\\] %{DATA:process.pid} %{GREEDYDATA:message}',
            ],
            source: 'RabbitMQ integration log pipeline',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'RabbitMQ logs with Erlang-style process IDs and connection details',
        },
      },
      // Apache Kafka Log
      {
        input: {
          stream_name: 'logs.kafka',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '[2023-01-15 10:30:45,123] INFO [KafkaServer id=1] started (kafka.server.KafkaServer)',
            '[2023-01-15 10:30:46,234] WARN [ReplicaManager broker=1] Partition [topic-1,0] on broker 1: No checkpointed highwatermark is found for partition topic-1-0 (kafka.server.ReplicaManager)',
            '[2023-01-15 10:30:47,345] ERROR [KafkaController id=1] Error processing append log dir event (kafka.controller.KafkaController)',
            '[2023-01-15 10:30:48,456] INFO [GroupCoordinator 1]: Preparing to rebalance group my-consumer-group (kafka.coordinator.group.GroupCoordinator)',
            '[2023-01-15 10:30:49,567] INFO [SocketServer brokerId=1] Started processors for 1 acceptors (kafka.network.SocketServer)',
            '[2023-01-15 10:30:50,678] WARN [ReplicaFetcherManager on broker 1] Removed fetcher for partitions Set(topic-1-0) (kafka.server.ReplicaFetcherManager)',
            '[2023-01-15 10:30:51,789] INFO [Log partition=topic-1-0, dir=/var/lib/kafka/data] Loading producer state from offset 0 for partition topic-1-0 (kafka.log.Log)',
            '[2023-01-15 10:30:52,890] ERROR [ReplicaManager broker=1] Error processing fetch operation on partition topic-1-0 (kafka.server.ReplicaManager)',
            '[2023-01-15 10:30:53,901] INFO [Transaction Coordinator 1]: Completed loading of log for partition __transaction_state-0 (kafka.coordinator.transaction.TransactionCoordinator)',
            '[2023-01-15 10:30:54,012] WARN [NetworkClient clientId=consumer-1] Connection to node 1 could not be established. Broker may not be available. (org.apache.kafka.clients.NetworkClient)',
          ],
        },
        output: {
          source_id: 'kafka',
          source_type: 'integration',
          integration_package: 'kafka',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'yyyy-MM-dd HH:mm:ss,SSS',
              example_value: '2023-01-15 10:30:45,123',
              grok_pattern: 'TIMESTAMP_ISO8601',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['INFO', 'WARN', 'ERROR'],
              grok_pattern: 'LOGLEVEL',
            },
            other_fields: [
              {
                name: 'attributes.kafka.log.component',
                type: 'keyword',
                example_values: ['KafkaServer id=1', 'ReplicaManager broker=1'],
                required: true,
                grok_pattern: 'DATA',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: ['started'],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
              {
                name: 'attributes.log.logger',
                type: 'keyword',
                example_values: ['kafka.server.KafkaServer', 'kafka.server.ReplicaManager'],
                required: false,
                grok_pattern: 'JAVACLASS',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: true,
            expected_min_fields: 4,
            expected_max_fields: 7,
          },
          reference_patterns: {
            grok: [
              '\\[%{TIMESTAMP_ISO8601:@timestamp}\\] %{LOGLEVEL:log.level} \\[%{DATA:kafka.log.component}\\] %{GREEDYDATA:message}( \\(%{JAVACLASS:log.logger}\\))?',
            ],
            source: 'Kafka integration log pipeline',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Kafka logs with component identifiers and optional Java class names',
        },
      },
    ],
  },

  container: {
    name: 'Container Logs - Grok Extraction',
    description: 'Docker and container runtime logs',
    examples: [
      // Docker Container Log (JSON format)
      {
        input: {
          stream_name: 'logs.docker',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '{"log":"2023-01-15T10:30:45.123Z INFO  [main] Application started successfully\\n","stream":"stdout","time":"2023-01-15T10:30:45.123456789Z"}',
            '{"log":"2023-01-15T10:30:46.234Z WARN  [http-nio-8080-exec-1] Slow request detected: /api/users\\n","stream":"stdout","time":"2023-01-15T10:30:46.234567890Z"}',
            '{"log":"2023-01-15T10:30:47.345Z ERROR [scheduler-1] Database connection failed\\n","stream":"stderr","time":"2023-01-15T10:30:47.345678901Z"}',
            '{"log":"2023-01-15T10:30:48.456Z INFO  [main] Server listening on port 8080\\n","stream":"stdout","time":"2023-01-15T10:30:48.456789012Z"}',
            '{"log":"2023-01-15T10:30:49.567Z DEBUG [worker-thread-1] Processing task id=12345\\n","stream":"stdout","time":"2023-01-15T10:30:49.567890123Z"}',
            '{"log":"2023-01-15T10:30:50.678Z WARN  [health-check] Memory usage at 85%\\n","stream":"stdout","time":"2023-01-15T10:30:50.678901234Z"}',
            '{"log":"2023-01-15T10:30:51.789Z ERROR [exception-handler] Unhandled exception: NullPointerException\\n","stream":"stderr","time":"2023-01-15T10:30:51.789012345Z"}',
            '{"log":"2023-01-15T10:30:52.890Z INFO  [shutdown-hook] Graceful shutdown initiated\\n","stream":"stdout","time":"2023-01-15T10:30:52.890123456Z"}',
            '{"log":"2023-01-15T10:30:53.901Z INFO  [cleanup-thread] Cleaning up temporary files\\n","stream":"stdout","time":"2023-01-15T10:30:53.901234567Z"}',
            '{"log":"2023-01-15T10:30:54.012Z INFO  [main] Application shutdown complete\\n","stream":"stdout","time":"2023-01-15T10:30:54.012345678Z"}',
          ],
        },
        output: {
          source_id: 'docker-json',
          source_type: 'synthetic',
          integration_package: '',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: "yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS'Z'",
              example_value: '2023-01-15T10:30:45.123456789Z',
              grok_pattern: 'TIMESTAMP_ISO8601',
            },
            other_fields: [
              {
                name: 'container.stream',
                type: 'keyword',
                example_values: ['stdout', 'stderr'],
                required: true,
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: [
                  '2023-01-15T10:30:45.123Z INFO  [main] Application started successfully',
                ],
                required: true,
                grok_pattern: 'GREEDYDATA',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: false,
            expected_min_fields: 3,
            expected_max_fields: 5,
          },
          reference_patterns: {
            grok: [
              '\\{"log":"%{GREEDYDATA:message}","stream":"%{WORD:container.stream}","time":"%{TIMESTAMP_ISO8601:@timestamp}"\\}',
            ],
            source: 'Synthetic Docker JSON log format',
          },
        },
        metadata: {
          difficulty: 'hard',
          notes:
            'Docker JSON logs require parsing nested JSON structure and extracting embedded log message',
        },
      },
    ],
  },
};

/**
 * DISSECT PATTERN DATASETS
 */
export const DISSECT_PATTERN_DATASETS: Record<string, PatternExtractionEvaluationDataset> = {
  structured_logs: {
    name: 'Structured Logs - Dissect Extraction',
    description: 'Consistently formatted logs with clear delimiters',
    examples: [
      // 🔧 NEW DATASETS GO HERE - Added by create_dataset_from_clipboard.ts
      // Simple Application Log with Brackets
      {
        input: {
          stream_name: 'logs.app',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '[2023-01-15 10:30:45] [INFO] [UserService] User login successful: user_id=12345',
            '[2023-01-15 10:30:46] [WARN] [DatabasePool] Connection pool near capacity: 95%',
            '[2023-01-15 10:30:47] [ERROR] [PaymentProcessor] Payment failed: transaction_id=tx_9876, reason=Insufficient funds',
            '[2023-01-15 10:30:48] [DEBUG] [CacheManager] Cache hit: key=user:12345:profile, ttl=3600',
            '[2023-01-15 10:30:49] [INFO] [AuthService] Token refreshed for user_id=67890',
            '[2023-01-15 10:30:50] [WARN] [QueueWorker] Queue depth exceeding threshold: 500 messages',
            '[2023-01-15 10:30:51] [ERROR] [EmailService] SMTP connection timeout after 30s',
            '[2023-01-15 10:30:52] [INFO] [ApiGateway] Request forwarded to backend: /api/v2/users',
            '[2023-01-15 10:30:53] [DEBUG] [SessionManager] Session expired: session_id=sess_abc123',
            '[2023-01-15 10:30:54] [INFO] [HealthCheck] All services operational',
          ],
        },
        output: {
          source_id: 'structured-app-log',
          source_type: 'synthetic',
          integration_package: '',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'yyyy-MM-dd HH:mm:ss',
              example_value: '2023-01-15 10:30:45',
              dissect_pattern: '%{@timestamp}',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['INFO', 'WARN', 'ERROR', 'DEBUG'],
              dissect_pattern: '%{log.level}',
            },
            other_fields: [
              {
                name: 'attributes.service.name',
                type: 'keyword',
                example_values: ['UserService', 'DatabasePool', 'PaymentProcessor'],
                required: true,
                dissect_pattern: '%{service.name}',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: ['User login successful: user_id=12345'],
                required: true,
                dissect_pattern: '%{message}',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: false,
            expected_min_fields: 4,
            expected_max_fields: 6,
          },
          reference_patterns: {
            dissect: '[%{@timestamp}] [%{log.level}] [%{service.name}] %{message}',
            source: 'Synthetic structured log format',
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Simple bracket-delimited format ideal for dissect',
        },
      },
      // Pipe-delimited Log
      {
        input: {
          stream_name: 'logs.pipeline',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '2023-01-15T10:30:45.123Z|prod-server-01|web-app|INFO|Request processed|duration_ms=45|status_code=200',
            '2023-01-15T10:30:46.234Z|prod-server-02|api-gateway|WARN|Rate limit approaching|requests=950|limit=1000',
            '2023-01-15T10:30:47.345Z|prod-server-01|auth-service|ERROR|Token validation failed|user_id=unknown|ip=192.168.1.100',
            '2023-01-15T10:30:48.456Z|prod-server-03|cache-service|DEBUG|Cache updated|key=session:abc123|size_bytes=2048',
            '2023-01-15T10:30:49.567Z|prod-server-01|database|INFO|Query executed|duration_ms=123|rows_affected=45',
            '2023-01-15T10:30:50.678Z|prod-server-02|load-balancer|WARN|Backend node unhealthy|node=backend-03|checks_failed=3',
            '2023-01-15T10:30:51.789Z|prod-server-03|message-queue|ERROR|Failed to publish message|queue=orders|error=timeout',
            '2023-01-15T10:30:52.890Z|prod-server-01|metrics-collector|INFO|Metrics sent to aggregator|count=1250|interval=60s',
            '2023-01-15T10:30:53.901Z|prod-server-02|scheduler|DEBUG|Job scheduled|job_id=job_789|next_run=2023-01-15T11:00:00Z',
            '2023-01-15T10:30:54.012Z|prod-server-03|alerting|INFO|Alert cleared|alert_id=alert_456|duration=5m',
          ],
        },
        output: {
          source_id: 'pipe-delimited-log',
          source_type: 'synthetic',
          integration_package: '',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
              example_value: '2023-01-15T10:30:45.123Z',
              dissect_pattern: '%{@timestamp}',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['INFO', 'WARN', 'ERROR', 'DEBUG'],
              dissect_pattern: '%{log.level}',
            },
            other_fields: [
              {
                name: 'attributes.host.name',
                type: 'keyword',
                example_values: ['prod-server-01', 'prod-server-02', 'prod-server-03'],
                required: true,
                dissect_pattern: '%{host.name}',
              },
              {
                name: 'attributes.service.name',
                type: 'keyword',
                example_values: ['web-app', 'api-gateway', 'auth-service'],
                required: true,
                dissect_pattern: '%{service.name}',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: ['Request processed'],
                required: true,
                dissect_pattern: '%{message}',
              },
              {
                name: 'attributes.event.details',
                type: 'text',
                example_values: ['duration_ms=45|status_code=200'],
                required: false,
                dissect_pattern: '%{event.details}',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: false,
            expected_min_fields: 6,
            expected_max_fields: 7,
          },
          reference_patterns: {
            dissect:
              '%{@timestamp}|%{host.name}|%{service.name}|%{log.level}|%{message}|%{event.details}',
            source: 'Synthetic pipe-delimited format',
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Pipe-delimited format perfect for dissect patterns',
        },
      },
      // Tab-delimited Log (TSV)
      {
        input: {
          stream_name: 'logs.tsv',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '2023-01-15T10:30:45.123Z\tINFO\tapi-server\t192.168.1.100\tGET\t/api/users\t200\t45ms',
            '2023-01-15T10:30:46.234Z\tWARN\tauth-service\t10.0.0.5\tPOST\t/auth/login\t401\t123ms',
            '2023-01-15T10:30:47.345Z\tERROR\tdatabase-worker\t172.16.0.10\tQUERY\t-\t500\t5002ms',
            '2023-01-15T10:30:48.456Z\tDEBUG\tcache-manager\t127.0.0.1\tGET\t/cache/status\t200\t2ms',
            '2023-01-15T10:30:49.567Z\tINFO\tweb-server\t192.168.1.101\tPOST\t/api/orders\t201\t89ms',
            '2023-01-15T10:30:50.678Z\tWARN\tpayment-service\t10.0.0.6\tPOST\t/api/payments\t429\t45ms',
            '2023-01-15T10:30:51.789Z\tERROR\temail-sender\t172.16.0.11\tSEND\t-\t500\t15000ms',
            '2023-01-15T10:30:52.890Z\tINFO\tnotification-worker\t127.0.0.1\tPUSH\t/notifications\t200\t12ms',
            '2023-01-15T10:30:53.901Z\tDEBUG\tsession-store\t192.168.1.102\tGET\t/sessions/abc123\t200\t8ms',
            '2023-01-15T10:30:54.012Z\tINFO\tmetrics-api\t10.0.0.7\tGET\t/metrics\t200\t34ms',
          ],
        },
        output: {
          source_id: 'tsv-log',
          source_type: 'synthetic',
          integration_package: '',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
              example_value: '2023-01-15T10:30:45.123Z',
              dissect_pattern: '%{@timestamp}',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['INFO', 'WARN', 'ERROR', 'DEBUG'],
              dissect_pattern: '%{log.level}',
            },
            other_fields: [
              {
                name: 'attributes.service.name',
                type: 'keyword',
                example_values: ['api-server', 'auth-service', 'database-worker'],
                required: true,
                dissect_pattern: '%{service.name}',
              },
              {
                name: 'attributes.source.ip',
                type: 'ip',
                example_values: ['192.168.1.100', '10.0.0.5'],
                required: true,
                dissect_pattern: '%{source.ip}',
              },
              {
                name: 'attributes.http.request.method',
                type: 'keyword',
                example_values: ['GET', 'POST', 'QUERY'],
                required: true,
                dissect_pattern: '%{http.request.method}',
              },
              {
                name: 'attributes.url.path',
                type: 'keyword',
                example_values: ['/api/users', '/auth/login', '-'],
                required: true,
                dissect_pattern: '%{url.path}',
              },
              {
                name: 'attributes.http.response.status_code',
                type: 'number',
                example_values: ['200', '401', '500'],
                required: true,
                dissect_pattern: '%{http.response.status_code}',
              },
              {
                name: 'attributes.event.duration',
                type: 'keyword',
                example_values: ['45ms', '123ms'],
                required: true,
                dissect_pattern: '%{event.duration}',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: false,
            expected_min_fields: 8,
            expected_max_fields: 8,
          },
          reference_patterns: {
            dissect:
              '%{@timestamp}\t%{log.level}\t%{service.name}\t%{source.ip}\t%{http.request.method}\t%{url.path}\t%{http.response.status_code}\t%{event.duration}',
            source: 'Synthetic tab-separated format',
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Tab-separated values (TSV) format - clean delimiters for dissect',
        },
      },
    ],
  },

  csv_logs: {
    name: 'CSV-style Logs - Dissect Extraction',
    description: 'Comma or pipe-separated log formats',
    examples: [
      // CSV Application Log
      {
        input: {
          stream_name: 'logs.csv',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '"2023-01-15 10:30:45","INFO","UserController","login","user123","192.168.1.10","Success"',
            '"2023-01-15 10:30:46","WARN","DatabaseManager","query","system","localhost","Slow query detected"',
            '"2023-01-15 10:30:47","ERROR","PaymentGateway","processPayment","user456","10.0.0.5","Transaction declined"',
            '"2023-01-15 10:30:48","DEBUG","CacheService","get","admin","127.0.0.1","Cache miss"',
            '"2023-01-15 10:30:49","INFO","OrderService","createOrder","user789","192.168.1.11","Order created"',
            '"2023-01-15 10:30:50","WARN","InventoryManager","checkStock","system","localhost","Low stock alert"',
            '"2023-01-15 10:30:51","ERROR","EmailService","sendEmail","user123","10.0.0.6","SMTP error"',
            '"2023-01-15 10:30:52","INFO","NotificationService","sendPush","user456","192.168.1.12","Notification sent"',
            '"2023-01-15 10:30:53","DEBUG","SessionManager","validate","user789","127.0.0.1","Session valid"',
            '"2023-01-15 10:30:54","INFO","HealthCheckController","checkHealth","system","localhost","All systems operational"',
          ],
        },
        output: {
          source_id: 'csv-app-log',
          source_type: 'synthetic',
          integration_package: '',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'yyyy-MM-dd HH:mm:ss',
              example_value: '2023-01-15 10:30:45',
              dissect_pattern: '"%{@timestamp}"',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['INFO', 'WARN', 'ERROR', 'DEBUG'],
              dissect_pattern: '"%{log.level}"',
            },
            other_fields: [
              {
                name: 'attributes.service.name',
                type: 'keyword',
                example_values: ['UserController', 'DatabaseManager', 'PaymentGateway'],
                required: true,
                dissect_pattern: '"%{service.name}"',
              },
              {
                name: 'attributes.event.action',
                type: 'keyword',
                example_values: ['login', 'query', 'processPayment'],
                required: true,
                dissect_pattern: '"%{event.action}"',
              },
              {
                name: 'attributes.user.name',
                type: 'keyword',
                example_values: ['user123', 'system', 'user456'],
                required: true,
                dissect_pattern: '"%{user.name}"',
              },
              {
                name: 'attributes.source.ip',
                type: 'ip',
                example_values: ['192.168.1.10', 'localhost', '10.0.0.5'],
                required: true,
                dissect_pattern: '"%{source.ip}"',
              },
              {
                name: 'body.text',
                type: 'text',
                example_values: ['Success', 'Slow query detected', 'Transaction declined'],
                required: true,
                dissect_pattern: '"%{message}"',
              },
            ],
          },
          pattern_characteristics: {
            should_handle_optional_fields: false,
            expected_min_fields: 7,
            expected_max_fields: 7,
          },
          reference_patterns: {
            dissect:
              '"%{@timestamp}","%{log.level}","%{service.name}","%{event.action}","%{user.name}","%{source.ip}","%{message}"',
            source: 'Synthetic CSV format',
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'CSV format with quoted fields - dissect handles delimiters well',
        },
      },
    ],
  },

  web_access_logs: {
    name: 'Web Access Logs - Dissect Extraction',
    description: 'Simple web server access logs with consistent delimiters',
    examples: [
      // Simple Space-Delimited Access Log
      {
        input: {
          stream_name: 'logs.web_access',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '192.168.1.100 GET /api/users 200 45 2023-01-15T10:30:45Z',
            '10.0.0.5 POST /api/login 401 0 2023-01-15T10:30:46Z',
            '172.16.0.10 GET /health 200 12 2023-01-15T10:30:47Z',
            '192.168.1.101 DELETE /api/users/123 204 0 2023-01-15T10:30:48Z',
            '10.0.0.6 PUT /api/settings 200 156 2023-01-15T10:30:49Z',
            '172.16.0.11 GET /static/app.js 200 45678 2023-01-15T10:30:50Z',
            '192.168.1.102 POST /api/orders 201 89 2023-01-15T10:30:51Z',
            '10.0.0.7 GET /api/products 200 2341 2023-01-15T10:30:52Z',
            '172.16.0.12 PATCH /api/users/456 200 34 2023-01-15T10:30:53Z',
            '192.168.1.103 GET /favicon.ico 404 0 2023-01-15T10:30:54Z',
          ],
        },
        output: {
          source_id: 'simple-access-log',
          source_type: 'synthetic',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: "yyyy-MM-dd'T'HH:mm:ss'Z'",
              example_value: '2023-01-15T10:30:45Z',
              dissect_pattern: '%{attributes.custom.timestamp}',
            },
            other_fields: [
              {
                name: 'attributes.source.ip',
                type: 'ip',
                required: true,
                dissect_pattern: '%{attributes.source.ip}',
              },
              {
                name: 'attributes.http.request.method',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.http.request.method}',
              },
              {
                name: 'attributes.url.path',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.url.path}',
              },
              {
                name: 'attributes.http.response.status_code',
                type: 'number',
                required: true,
                dissect_pattern: '%{attributes.http.response.status_code}',
              },
              {
                name: 'attributes.http.response.body.bytes',
                type: 'number',
                required: true,
                dissect_pattern: '%{attributes.http.response.body.bytes}',
              },
            ],
          },
          pattern_characteristics: {
            expected_min_fields: 6,
            expected_max_fields: 6,
          },
          reference_patterns: {
            dissect:
              '%{attributes.source.ip} %{attributes.http.request.method} %{attributes.url.path} %{attributes.http.response.status_code} %{attributes.http.response.body.bytes} %{attributes.custom.timestamp}',
            source: 'Synthetic simple access log format',
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Simple space-delimited access log - ideal for dissect',
        },
      },
      // HAProxy-style Log
      {
        input: {
          stream_name: 'logs.haproxy',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '2023-01-15T10:30:45.123Z frontend backend-api 192.168.1.100:54321 200 45 GET /api/users',
            '2023-01-15T10:30:46.234Z frontend backend-web 10.0.0.5:54322 301 0 GET /old-path',
            '2023-01-15T10:30:47.345Z frontend backend-api 172.16.0.10:54323 500 123 POST /api/orders',
            '2023-01-15T10:30:48.456Z frontend backend-static 192.168.1.101:54324 200 45678 GET /static/bundle.js',
            '2023-01-15T10:30:49.567Z frontend backend-api 10.0.0.6:54325 401 0 POST /api/login',
            '2023-01-15T10:30:50.678Z frontend backend-ws 172.16.0.11:54326 101 0 GET /ws/connect',
            '2023-01-15T10:30:51.789Z frontend backend-api 192.168.1.102:54327 204 0 DELETE /api/sessions/abc',
            '2023-01-15T10:30:52.890Z frontend backend-cache 10.0.0.7:54328 304 0 GET /api/cached-data',
            '2023-01-15T10:30:53.901Z frontend backend-api 172.16.0.12:54329 429 89 POST /api/batch',
            '2023-01-15T10:30:54.012Z frontend backend-health 192.168.1.103:54330 200 15 GET /health',
          ],
        },
        output: {
          source_id: 'haproxy-style-log',
          source_type: 'synthetic',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
              example_value: '2023-01-15T10:30:45.123Z',
              dissect_pattern: '%{attributes.custom.timestamp}',
            },
            other_fields: [
              {
                name: 'attributes.haproxy.frontend_name',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.haproxy.frontend_name}',
              },
              {
                name: 'attributes.haproxy.backend_name',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.haproxy.backend_name}',
              },
              {
                name: 'attributes.source.address',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.source.address}',
              },
              {
                name: 'attributes.http.response.status_code',
                type: 'number',
                required: true,
                dissect_pattern: '%{attributes.http.response.status_code}',
              },
              {
                name: 'attributes.http.response.body.bytes',
                type: 'number',
                required: true,
                dissect_pattern: '%{attributes.http.response.body.bytes}',
              },
              {
                name: 'attributes.http.request.method',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.http.request.method}',
              },
              {
                name: 'attributes.url.path',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.url.path}',
              },
            ],
          },
          pattern_characteristics: {
            expected_min_fields: 8,
            expected_max_fields: 8,
          },
          reference_patterns: {
            dissect:
              '%{attributes.custom.timestamp} %{attributes.haproxy.frontend_name} %{attributes.haproxy.backend_name} %{attributes.source.address} %{attributes.http.response.status_code} %{attributes.http.response.body.bytes} %{attributes.http.request.method} %{attributes.url.path}',
            source: 'Synthetic HAProxy-style log format',
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'HAProxy-style access log with backend routing info',
        },
      },
    ],
  },

  syslog_style: {
    name: 'Syslog-Style Logs - Dissect Extraction',
    description: 'BSD and RFC syslog format logs with consistent structure',
    examples: [
      // BSD Syslog Format
      {
        input: {
          stream_name: 'logs.syslog_bsd',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '<134>Jan 15 10:30:45 server01 nginx: 192.168.1.100 GET /api/users 200',
            '<131>Jan 15 10:30:46 server02 sshd: Accepted password for admin from 10.0.0.5',
            '<135>Jan 15 10:30:47 server01 cron: Job scheduled: backup-daily',
            '<131>Jan 15 10:30:48 server03 kernel: Out of memory: Killed process 1234',
            '<134>Jan 15 10:30:49 server02 nginx: 172.16.0.10 POST /api/login 401',
            '<135>Jan 15 10:30:50 server01 systemd: Started MySQL Server',
            '<131>Jan 15 10:30:51 server03 sshd: Failed password for root from 192.168.1.200',
            '<134>Jan 15 10:30:52 server02 nginx: 10.0.0.6 DELETE /api/sessions 204',
            '<135>Jan 15 10:30:53 server01 docker: Container app-01 started',
            '<131>Jan 15 10:30:54 server03 kernel: TCP: request_sock_TCP: Possible SYN flooding',
          ],
        },
        output: {
          source_id: 'syslog-bsd',
          source_type: 'synthetic',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'MMM dd HH:mm:ss',
              example_value: 'Jan 15 10:30:45',
              dissect_pattern: '%{attributes.custom.timestamp}',
            },
            other_fields: [
              {
                name: 'attributes.log.syslog.priority',
                type: 'number',
                required: true,
                dissect_pattern: '<%{attributes.log.syslog.priority}>',
              },
              {
                name: 'attributes.host.name',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.host.name}',
              },
              {
                name: 'attributes.process.name',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.process.name}',
              },
              {
                name: 'body.text',
                type: 'text',
                required: true,
                dissect_pattern: '%{body.text}',
              },
            ],
          },
          pattern_characteristics: {
            expected_min_fields: 5,
            expected_max_fields: 6,
          },
          reference_patterns: {
            dissect:
              '<%{attributes.log.syslog.priority}>%{attributes.custom.timestamp} %{attributes.host.name} %{attributes.process.name}: %{body.text}',
            source: 'BSD syslog format',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'BSD syslog format with priority, timestamp, host, and process',
        },
      },
      // RFC 5424 Syslog Format (simplified)
      {
        input: {
          stream_name: 'logs.syslog_rfc5424',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '<134>1 2023-01-15T10:30:45.123Z server01 nginx 1234 - - GET /api/users returned 200',
            '<131>1 2023-01-15T10:30:46.234Z server02 sshd 5678 - - Connection from 10.0.0.5 accepted',
            '<135>1 2023-01-15T10:30:47.345Z server01 cron 9012 - - Starting scheduled job backup',
            '<131>1 2023-01-15T10:30:48.456Z server03 kernel - - - Memory pressure detected',
            '<134>1 2023-01-15T10:30:49.567Z server02 nginx 1235 - - POST /api/login failed 401',
            '<135>1 2023-01-15T10:30:50.678Z server01 systemd 1 - - Started service mysql.service',
            '<131>1 2023-01-15T10:30:51.789Z server03 sshd 5679 - - Authentication failure for root',
            '<134>1 2023-01-15T10:30:52.890Z server02 nginx 1236 - - DELETE /api/sessions returned 204',
            '<135>1 2023-01-15T10:30:53.901Z server01 docker 3456 - - Container started: app-01',
            '<131>1 2023-01-15T10:30:54.012Z server03 kernel - - - TCP SYN flood detected',
          ],
        },
        output: {
          source_id: 'syslog-rfc5424',
          source_type: 'synthetic',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
              example_value: '2023-01-15T10:30:45.123Z',
              dissect_pattern: '%{attributes.custom.timestamp}',
            },
            other_fields: [
              {
                name: 'attributes.log.syslog.priority',
                type: 'number',
                required: true,
                dissect_pattern: '<%{attributes.log.syslog.priority}>',
              },
              {
                name: 'attributes.log.syslog.version',
                type: 'number',
                required: true,
                dissect_pattern: '%{attributes.log.syslog.version}',
              },
              {
                name: 'attributes.host.name',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.host.name}',
              },
              {
                name: 'attributes.process.name',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.process.name}',
              },
              {
                name: 'attributes.process.pid',
                type: 'keyword',
                required: false,
                dissect_pattern: '%{attributes.process.pid}',
              },
              {
                name: 'body.text',
                type: 'text',
                required: true,
                dissect_pattern: '%{body.text}',
              },
            ],
          },
          pattern_characteristics: {
            expected_min_fields: 7,
            expected_max_fields: 8,
          },
          reference_patterns: {
            dissect:
              '<%{attributes.log.syslog.priority}>%{attributes.log.syslog.version} %{attributes.custom.timestamp} %{attributes.host.name} %{attributes.process.name} %{attributes.process.pid} - - %{body.text}',
            source: 'RFC 5424 syslog format (simplified)',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'RFC 5424 syslog format with version and structured data placeholders',
        },
      },
    ],
  },

  network_security: {
    name: 'Network & Security Logs - Dissect Extraction',
    description: 'Firewall, network device, and security appliance logs',
    examples: [
      // Firewall Log (iptables-style)
      {
        input: {
          stream_name: 'logs.firewall',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '2023-01-15T10:30:45Z ACCEPT IN=eth0 OUT= SRC=192.168.1.100 DST=10.0.0.5 PROTO=TCP SPT=54321 DPT=443',
            '2023-01-15T10:30:46Z DROP IN=eth0 OUT= SRC=172.16.0.10 DST=10.0.0.5 PROTO=TCP SPT=12345 DPT=22',
            '2023-01-15T10:30:47Z ACCEPT IN=eth0 OUT=eth1 SRC=192.168.1.101 DST=8.8.8.8 PROTO=UDP SPT=53421 DPT=53',
            '2023-01-15T10:30:48Z DROP IN=eth0 OUT= SRC=10.0.0.100 DST=10.0.0.5 PROTO=ICMP TYPE=8 CODE=0',
            '2023-01-15T10:30:49Z ACCEPT IN=eth1 OUT= SRC=192.168.1.102 DST=10.0.0.5 PROTO=TCP SPT=44567 DPT=80',
            '2023-01-15T10:30:50Z DROP IN=eth0 OUT= SRC=172.16.0.11 DST=10.0.0.5 PROTO=TCP SPT=65432 DPT=3389',
            '2023-01-15T10:30:51Z ACCEPT IN=eth0 OUT=eth1 SRC=192.168.1.103 DST=1.1.1.1 PROTO=UDP SPT=54000 DPT=53',
            '2023-01-15T10:30:52Z DROP IN=eth0 OUT= SRC=10.0.0.101 DST=10.0.0.5 PROTO=TCP SPT=11111 DPT=445',
            '2023-01-15T10:30:53Z ACCEPT IN=eth1 OUT= SRC=192.168.1.104 DST=10.0.0.5 PROTO=TCP SPT=33333 DPT=8080',
            '2023-01-15T10:30:54Z DROP IN=eth0 OUT= SRC=172.16.0.12 DST=10.0.0.5 PROTO=TCP SPT=22222 DPT=1433',
          ],
        },
        output: {
          source_id: 'firewall-iptables',
          source_type: 'synthetic',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: "yyyy-MM-dd'T'HH:mm:ss'Z'",
              example_value: '2023-01-15T10:30:45Z',
              dissect_pattern: '%{attributes.custom.timestamp}',
            },
            other_fields: [
              {
                name: 'attributes.event.action',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.event.action}',
              },
              {
                name: 'attributes.observer.ingress.interface.name',
                type: 'keyword',
                required: true,
                dissect_pattern: 'IN=%{attributes.observer.ingress.interface.name}',
              },
              {
                name: 'attributes.source.ip',
                type: 'ip',
                required: true,
                dissect_pattern: 'SRC=%{attributes.source.ip}',
              },
              {
                name: 'attributes.destination.ip',
                type: 'ip',
                required: true,
                dissect_pattern: 'DST=%{attributes.destination.ip}',
              },
              {
                name: 'attributes.network.transport',
                type: 'keyword',
                required: true,
                dissect_pattern: 'PROTO=%{attributes.network.transport}',
              },
            ],
          },
          pattern_characteristics: {
            expected_min_fields: 6,
            expected_max_fields: 10,
          },
          reference_patterns: {
            dissect:
              '%{attributes.custom.timestamp} %{attributes.event.action} IN=%{attributes.observer.ingress.interface.name} OUT=%{?out} SRC=%{attributes.source.ip} DST=%{attributes.destination.ip} PROTO=%{attributes.network.transport} %{?rest}',
            source: 'Synthetic iptables-style firewall log',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Firewall logs with key=value pairs - dissect handles this pattern well',
        },
      },
      // VPN Connection Log
      {
        input: {
          stream_name: 'logs.vpn',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '2023-01-15 10:30:45 CONNECT user=alice client_ip=192.168.1.100 assigned_ip=10.8.0.10 tunnel=tun0',
            '2023-01-15 10:30:46 DISCONNECT user=bob client_ip=192.168.1.101 duration=3600 bytes_in=1048576 bytes_out=524288',
            '2023-01-15 10:30:47 AUTH_FAIL user=charlie client_ip=172.16.0.10 reason=invalid_password',
            '2023-01-15 10:30:48 CONNECT user=david client_ip=192.168.1.102 assigned_ip=10.8.0.11 tunnel=tun0',
            '2023-01-15 10:30:49 REKEY user=alice client_ip=192.168.1.100 new_key_id=12345',
            '2023-01-15 10:30:50 DISCONNECT user=eve client_ip=192.168.1.103 duration=7200 bytes_in=2097152 bytes_out=1048576',
            '2023-01-15 10:30:51 AUTH_FAIL user=frank client_ip=172.16.0.11 reason=certificate_expired',
            '2023-01-15 10:30:52 CONNECT user=grace client_ip=192.168.1.104 assigned_ip=10.8.0.12 tunnel=tun0',
            '2023-01-15 10:30:53 TIMEOUT user=henry client_ip=192.168.1.105 idle_time=900',
            '2023-01-15 10:30:54 DISCONNECT user=david client_ip=192.168.1.102 duration=360 bytes_in=51200 bytes_out=25600',
          ],
        },
        output: {
          source_id: 'vpn-connection-log',
          source_type: 'synthetic',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'yyyy-MM-dd HH:mm:ss',
              example_value: '2023-01-15 10:30:45',
              dissect_pattern: '%{attributes.custom.timestamp}',
            },
            other_fields: [
              {
                name: 'attributes.event.action',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.event.action}',
              },
              {
                name: 'attributes.user.name',
                type: 'keyword',
                required: true,
                dissect_pattern: 'user=%{attributes.user.name}',
              },
              {
                name: 'attributes.source.ip',
                type: 'ip',
                required: true,
                dissect_pattern: 'client_ip=%{attributes.source.ip}',
              },
              {
                name: 'body.text',
                type: 'text',
                required: true,
                dissect_pattern: '%{body.text}',
              },
            ],
          },
          pattern_characteristics: {
            expected_min_fields: 5,
            expected_max_fields: 8,
          },
          reference_patterns: {
            dissect:
              '%{attributes.custom.timestamp} %{attributes.event.action} user=%{attributes.user.name} client_ip=%{attributes.source.ip} %{body.text}',
            source: 'Synthetic VPN connection log',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'VPN logs with action types and key=value attributes',
        },
      },
    ],
  },

  database_logs: {
    name: 'Database Logs - Dissect Extraction',
    description: 'Simple database query and connection logs with fixed formats',
    examples: [
      // Database Query Log
      {
        input: {
          stream_name: 'logs.db_query',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '2023-01-15T10:30:45.123Z|SELECT|users|45|1|admin|SELECT * FROM users WHERE id = 1',
            '2023-01-15T10:30:46.234Z|INSERT|orders|123|1|app_user|INSERT INTO orders (user_id, total) VALUES (1, 99.99)',
            '2023-01-15T10:30:47.345Z|UPDATE|products|67|15|admin|UPDATE products SET stock = stock - 1 WHERE id = 123',
            '2023-01-15T10:30:48.456Z|DELETE|sessions|12|5|system|DELETE FROM sessions WHERE expired_at < NOW()',
            '2023-01-15T10:30:49.567Z|SELECT|products|234|100|app_user|SELECT * FROM products WHERE category = electronics',
            '2023-01-15T10:30:50.678Z|INSERT|audit_log|8|1|system|INSERT INTO audit_log (action, user_id) VALUES (login, 42)',
            '2023-01-15T10:30:51.789Z|UPDATE|users|89|1|admin|UPDATE users SET last_login = NOW() WHERE id = 42',
            '2023-01-15T10:30:52.890Z|SELECT|orders|456|25|app_user|SELECT * FROM orders WHERE status = pending',
            '2023-01-15T10:30:53.901Z|DELETE|temp_data|5|1000|system|DELETE FROM temp_data WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 DAY)',
            '2023-01-15T10:30:54.012Z|SELECT|inventory|178|50|warehouse|SELECT * FROM inventory WHERE quantity < 10',
          ],
        },
        output: {
          source_id: 'database-query-log',
          source_type: 'synthetic',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
              example_value: '2023-01-15T10:30:45.123Z',
              dissect_pattern: '%{attributes.custom.timestamp}',
            },
            other_fields: [
              {
                name: 'attributes.db.operation',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.db.operation}',
              },
              {
                name: 'attributes.db.sql.table',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.db.sql.table}',
              },
              {
                name: 'attributes.event.duration',
                type: 'number',
                required: true,
                dissect_pattern: '%{attributes.event.duration}',
              },
              {
                name: 'attributes.db.sql.rows_affected',
                type: 'number',
                required: true,
                dissect_pattern: '%{attributes.db.sql.rows_affected}',
              },
              {
                name: 'attributes.user.name',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.user.name}',
              },
              {
                name: 'body.text',
                type: 'text',
                required: true,
                dissect_pattern: '%{body.text}',
              },
            ],
          },
          pattern_characteristics: {
            expected_min_fields: 7,
            expected_max_fields: 7,
          },
          reference_patterns: {
            dissect:
              '%{attributes.custom.timestamp}|%{attributes.db.operation}|%{attributes.db.sql.table}|%{attributes.event.duration}|%{attributes.db.sql.rows_affected}|%{attributes.user.name}|%{body.text}',
            source: 'Synthetic database query log',
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Pipe-delimited database query log with operation details',
        },
      },
      // Database Connection Pool Log
      {
        input: {
          stream_name: 'logs.db_pool',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '[2023-01-15 10:30:45] [pool-main] ACQUIRE conn_id=1 wait_ms=5 active=10 idle=5 total=15',
            '[2023-01-15 10:30:46] [pool-main] RELEASE conn_id=1 held_ms=45 active=9 idle=6 total=15',
            '[2023-01-15 10:30:47] [pool-main] CREATE conn_id=16 connect_ms=123 active=10 idle=5 total=16',
            '[2023-01-15 10:30:48] [pool-replica] ACQUIRE conn_id=5 wait_ms=0 active=3 idle=7 total=10',
            '[2023-01-15 10:30:49] [pool-main] TIMEOUT conn_id=2 wait_ms=5000 active=15 idle=0 total=15',
            '[2023-01-15 10:30:50] [pool-replica] RELEASE conn_id=5 held_ms=89 active=2 idle=8 total=10',
            '[2023-01-15 10:30:51] [pool-main] DESTROY conn_id=3 reason=idle_timeout active=9 idle=5 total=14',
            '[2023-01-15 10:30:52] [pool-main] ACQUIRE conn_id=4 wait_ms=12 active=10 idle=4 total=14',
            '[2023-01-15 10:30:53] [pool-replica] CREATE conn_id=11 connect_ms=98 active=4 idle=6 total=11',
            '[2023-01-15 10:30:54] [pool-main] RELEASE conn_id=4 held_ms=234 active=9 idle=5 total=14',
          ],
        },
        output: {
          source_id: 'database-pool-log',
          source_type: 'synthetic',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'yyyy-MM-dd HH:mm:ss',
              example_value: '2023-01-15 10:30:45',
              dissect_pattern: '[%{attributes.custom.timestamp}]',
            },
            other_fields: [
              {
                name: 'attributes.db.connection.pool.name',
                type: 'keyword',
                required: true,
                dissect_pattern: '[%{attributes.db.connection.pool.name}]',
              },
              {
                name: 'attributes.event.action',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.event.action}',
              },
              {
                name: 'attributes.db.connection.id',
                type: 'keyword',
                required: true,
                dissect_pattern: 'conn_id=%{attributes.db.connection.id}',
              },
              {
                name: 'body.text',
                type: 'text',
                required: true,
                dissect_pattern: '%{body.text}',
              },
            ],
          },
          pattern_characteristics: {
            expected_min_fields: 5,
            expected_max_fields: 8,
          },
          reference_patterns: {
            dissect:
              '[%{attributes.custom.timestamp}] [%{attributes.db.connection.pool.name}] %{attributes.event.action} conn_id=%{attributes.db.connection.id} %{body.text}',
            source: 'Synthetic database connection pool log',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Connection pool log with acquire/release events and pool metrics',
        },
      },
    ],
  },

  application_logs: {
    name: 'Application Logs - Dissect Extraction',
    description: 'Various application log formats with consistent structure',
    examples: [
      // Spring Boot Style Log
      {
        input: {
          stream_name: 'logs.spring_boot',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '2023-01-15 10:30:45.123 INFO 12345 --- [main] c.e.app.Application : Starting Application v1.0.0',
            '2023-01-15 10:30:46.234 INFO 12345 --- [main] o.s.b.w.e.tomcat.TomcatWebServer : Tomcat started on port 8080',
            '2023-01-15 10:30:47.345 WARN 12345 --- [http-nio-8080-exec-1] c.e.app.UserService : User not found: id=999',
            '2023-01-15 10:30:48.456 ERROR 12345 --- [http-nio-8080-exec-2] c.e.app.PaymentService : Payment failed: amount=99.99',
            '2023-01-15 10:30:49.567 DEBUG 12345 --- [scheduler-1] c.e.app.CacheService : Cache refresh completed: items=1000',
            '2023-01-15 10:30:50.678 INFO 12345 --- [main] c.e.app.Application : Application started in 5.432 seconds',
            '2023-01-15 10:30:51.789 WARN 12345 --- [http-nio-8080-exec-3] c.e.app.RateLimiter : Rate limit exceeded: ip=192.168.1.100',
            '2023-01-15 10:30:52.890 ERROR 12345 --- [async-exec-1] c.e.app.EmailService : SMTP connection failed: host=mail.example.com',
            '2023-01-15 10:30:53.901 INFO 12345 --- [http-nio-8080-exec-4] c.e.app.OrderService : Order created: order_id=ORD-12345',
            '2023-01-15 10:30:54.012 DEBUG 12345 --- [pool-1-thread-1] c.e.app.MetricsService : Metrics exported: count=150',
          ],
        },
        output: {
          source_id: 'spring-boot-log',
          source_type: 'synthetic',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: 'yyyy-MM-dd HH:mm:ss.SSS',
              example_value: '2023-01-15 10:30:45.123',
              dissect_pattern: '%{attributes.custom.timestamp}',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['INFO', 'WARN', 'ERROR', 'DEBUG'],
              dissect_pattern: '%{attributes.log.level}',
            },
            other_fields: [
              {
                name: 'attributes.process.pid',
                type: 'number',
                required: true,
                dissect_pattern: '%{attributes.process.pid}',
              },
              {
                name: 'attributes.process.thread.name',
                type: 'keyword',
                required: true,
                dissect_pattern: '[%{attributes.process.thread.name}]',
              },
              {
                name: 'attributes.log.logger',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.log.logger}',
              },
              {
                name: 'body.text',
                type: 'text',
                required: true,
                dissect_pattern: '%{body.text}',
              },
            ],
          },
          pattern_characteristics: {
            expected_min_fields: 6,
            expected_max_fields: 6,
          },
          reference_patterns: {
            dissect:
              '%{attributes.custom.timestamp} %{attributes.log.level} %{attributes.process.pid} --- [%{attributes.process.thread.name}] %{attributes.log.logger} : %{body.text}',
            source: 'Spring Boot default log format',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Spring Boot default logging format with thread name and logger class',
        },
      },
      // JSON-ish Log (key=value style)
      {
        input: {
          stream_name: 'logs.keyvalue',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            'ts=2023-01-15T10:30:45Z level=info caller=main.go:42 msg="Server starting" port=8080 version=1.0.0',
            'ts=2023-01-15T10:30:46Z level=info caller=http.go:156 msg="Request received" method=GET path=/api/users duration=45ms',
            'ts=2023-01-15T10:30:47Z level=warn caller=auth.go:89 msg="Auth failed" user=unknown ip=192.168.1.100 reason=invalid_token',
            'ts=2023-01-15T10:30:48Z level=error caller=db.go:234 msg="Query failed" table=users error=connection_timeout retry=3',
            'ts=2023-01-15T10:30:49Z level=debug caller=cache.go:67 msg="Cache hit" key=user:123 ttl=3600s size=2048',
            'ts=2023-01-15T10:30:50Z level=info caller=http.go:156 msg="Request received" method=POST path=/api/orders duration=123ms',
            'ts=2023-01-15T10:30:51Z level=warn caller=ratelimit.go:45 msg="Rate limit" ip=10.0.0.5 requests=1000 limit=1000',
            'ts=2023-01-15T10:30:52Z level=error caller=email.go:112 msg="SMTP error" host=mail.example.com error=connection_refused',
            'ts=2023-01-15T10:30:53Z level=info caller=metrics.go:78 msg="Metrics exported" count=150 interval=60s',
            'ts=2023-01-15T10:30:54Z level=info caller=main.go:99 msg="Shutdown complete" uptime=86400s requests_total=1000000',
          ],
        },
        output: {
          source_id: 'keyvalue-log',
          source_type: 'synthetic',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: "yyyy-MM-dd'T'HH:mm:ss'Z'",
              example_value: '2023-01-15T10:30:45Z',
              dissect_pattern: 'ts=%{attributes.custom.timestamp}',
            },
            log_level: {
              field_name: 'attributes.log.level',
              example_values: ['info', 'warn', 'error', 'debug'],
              dissect_pattern: 'level=%{attributes.log.level}',
            },
            other_fields: [
              {
                name: 'attributes.log.origin.file.name',
                type: 'keyword',
                required: true,
                dissect_pattern: 'caller=%{attributes.log.origin.file.name}',
              },
              {
                name: 'body.text',
                type: 'text',
                required: true,
                dissect_pattern: 'msg="%{body.text}"',
              },
            ],
          },
          pattern_characteristics: {
            expected_min_fields: 4,
            expected_max_fields: 8,
          },
          reference_patterns: {
            dissect:
              'ts=%{attributes.custom.timestamp} level=%{attributes.log.level} caller=%{attributes.log.origin.file.name} msg="%{body.text}" %{?rest}',
            source: 'Key-value style log format (logfmt)',
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Logfmt-style key=value log format common in Go applications',
        },
      },
    ],
  },

  metrics_monitoring: {
    name: 'Metrics & Monitoring Logs - Dissect Extraction',
    description: 'System metrics, health checks, and monitoring logs',
    examples: [
      // System Metrics Log
      {
        input: {
          stream_name: 'logs.system_metrics',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '2023-01-15T10:30:45Z server01 cpu_percent=45.2 mem_percent=67.8 disk_percent=34.5 load_1m=1.23',
            '2023-01-15T10:30:46Z server02 cpu_percent=78.9 mem_percent=82.1 disk_percent=45.6 load_1m=3.45',
            '2023-01-15T10:30:47Z server03 cpu_percent=12.3 mem_percent=45.6 disk_percent=78.9 load_1m=0.56',
            '2023-01-15T10:30:48Z server01 cpu_percent=46.1 mem_percent=68.2 disk_percent=34.5 load_1m=1.34',
            '2023-01-15T10:30:49Z server02 cpu_percent=81.2 mem_percent=83.4 disk_percent=45.7 load_1m=3.78',
            '2023-01-15T10:30:50Z server03 cpu_percent=15.6 mem_percent=46.2 disk_percent=78.9 load_1m=0.67',
            '2023-01-15T10:30:51Z server01 cpu_percent=44.8 mem_percent=67.5 disk_percent=34.6 load_1m=1.21',
            '2023-01-15T10:30:52Z server02 cpu_percent=76.5 mem_percent=81.8 disk_percent=45.8 load_1m=3.34',
            '2023-01-15T10:30:53Z server03 cpu_percent=11.2 mem_percent=45.1 disk_percent=79.0 load_1m=0.45',
            '2023-01-15T10:30:54Z server01 cpu_percent=47.3 mem_percent=68.9 disk_percent=34.6 load_1m=1.45',
          ],
        },
        output: {
          source_id: 'system-metrics-log',
          source_type: 'synthetic',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: "yyyy-MM-dd'T'HH:mm:ss'Z'",
              example_value: '2023-01-15T10:30:45Z',
              dissect_pattern: '%{attributes.custom.timestamp}',
            },
            other_fields: [
              {
                name: 'attributes.host.name',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.host.name}',
              },
              {
                name: 'attributes.system.cpu.total.pct',
                type: 'number',
                required: true,
                dissect_pattern: 'cpu_percent=%{attributes.system.cpu.total.pct}',
              },
              {
                name: 'attributes.system.memory.used.pct',
                type: 'number',
                required: true,
                dissect_pattern: 'mem_percent=%{attributes.system.memory.used.pct}',
              },
              {
                name: 'attributes.system.filesystem.used.pct',
                type: 'number',
                required: true,
                dissect_pattern: 'disk_percent=%{attributes.system.filesystem.used.pct}',
              },
              {
                name: 'attributes.system.load.1',
                type: 'number',
                required: true,
                dissect_pattern: 'load_1m=%{attributes.system.load.1}',
              },
            ],
          },
          pattern_characteristics: {
            expected_min_fields: 6,
            expected_max_fields: 6,
          },
          reference_patterns: {
            dissect:
              '%{attributes.custom.timestamp} %{attributes.host.name} cpu_percent=%{attributes.system.cpu.total.pct} mem_percent=%{attributes.system.memory.used.pct} disk_percent=%{attributes.system.filesystem.used.pct} load_1m=%{attributes.system.load.1}',
            source: 'Synthetic system metrics log',
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'System metrics with CPU, memory, disk, and load averages',
        },
      },
      // Health Check Log
      {
        input: {
          stream_name: 'logs.health_check',
          connector_id: '',
          field_to_parse: 'body.text',
          sample_messages: [
            '2023-01-15T10:30:45Z|api-service|HEALTHY|response_time=45|checks_passed=5|checks_total=5',
            '2023-01-15T10:30:46Z|database|HEALTHY|response_time=12|checks_passed=3|checks_total=3',
            '2023-01-15T10:30:47Z|cache-service|DEGRADED|response_time=234|checks_passed=2|checks_total=3',
            '2023-01-15T10:30:48Z|message-queue|HEALTHY|response_time=8|checks_passed=4|checks_total=4',
            '2023-01-15T10:30:49Z|search-service|UNHEALTHY|response_time=5000|checks_passed=1|checks_total=3',
            '2023-01-15T10:30:50Z|api-service|HEALTHY|response_time=42|checks_passed=5|checks_total=5',
            '2023-01-15T10:30:51Z|database|HEALTHY|response_time=15|checks_passed=3|checks_total=3',
            '2023-01-15T10:30:52Z|cache-service|HEALTHY|response_time=89|checks_passed=3|checks_total=3',
            '2023-01-15T10:30:53Z|message-queue|HEALTHY|response_time=6|checks_passed=4|checks_total=4',
            '2023-01-15T10:30:54Z|search-service|DEGRADED|response_time=2500|checks_passed=2|checks_total=3',
          ],
        },
        output: {
          source_id: 'health-check-log',
          source_type: 'synthetic',
          sample_messages: [],
          expected_fields: {
            timestamp: {
              field_name: 'attributes.custom.timestamp',
              format: "yyyy-MM-dd'T'HH:mm:ss'Z'",
              example_value: '2023-01-15T10:30:45Z',
              dissect_pattern: '%{attributes.custom.timestamp}',
            },
            other_fields: [
              {
                name: 'attributes.service.name',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.service.name}',
              },
              {
                name: 'attributes.service.state',
                type: 'keyword',
                required: true,
                dissect_pattern: '%{attributes.service.state}',
              },
              {
                name: 'attributes.event.duration',
                type: 'number',
                required: true,
                dissect_pattern: 'response_time=%{attributes.event.duration}',
              },
              {
                name: 'attributes.health.checks_passed',
                type: 'number',
                required: true,
                dissect_pattern: 'checks_passed=%{attributes.health.checks_passed}',
              },
              {
                name: 'attributes.health.checks_total',
                type: 'number',
                required: true,
                dissect_pattern: 'checks_total=%{attributes.health.checks_total}',
              },
            ],
          },
          pattern_characteristics: {
            expected_min_fields: 6,
            expected_max_fields: 6,
          },
          reference_patterns: {
            dissect:
              '%{attributes.custom.timestamp}|%{attributes.service.name}|%{attributes.service.state}|response_time=%{attributes.event.duration}|checks_passed=%{attributes.health.checks_passed}|checks_total=%{attributes.health.checks_total}',
            source: 'Synthetic health check log',
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Health check logs with service status and check results',
        },
      },
    ],
  },
};
