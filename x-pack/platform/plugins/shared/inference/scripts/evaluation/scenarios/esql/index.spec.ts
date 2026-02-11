/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import type { Logger } from '@kbn/logging';
import { lastValueFrom } from 'rxjs';
import { naturalLanguageToEsql } from '../../../../server/tasks/nl_to_esql';
import { chatClient, evaluationClient, logger } from '../../services';
import { EsqlDocumentBase } from '../../../../server/tasks/nl_to_esql/doc_base';

interface TestCase {
  title: string;
  question: string;
  expected?: string;
  criteria?: string[];
  only?: boolean;
}

interface Section {
  title: string;
  tests: TestCase[];
}

const callNaturalLanguageToEsql = async (question: string) => {
  return await lastValueFrom(
    naturalLanguageToEsql({
      client: {
        output: chatClient.output,
        chatComplete: chatClient.chatComplete,
      },
      connectorId: chatClient.getConnectorId(),
      input: question,
      logger: {
        debug: (source) => {
          logger.debug(typeof source === 'function' ? source() : source);
        },
      } as Logger,
    })
  );
};

const expectedQueryCriteria = (expected: string) => {
  return `The answer provides a ES|QL query that is functionally equivalent to:

          \`\`\`esql
          ${expected}
          \`\`\`

          It's OK if column names are slightly different, or if the used functions or operators are different,
          as long as the expected end result is the same.`;
};

const retrieveUsedCommands = async ({
  question,
  answer,
  esqlDescription,
}: {
  question: string;
  answer: string;
  esqlDescription: string;
}) => {
  const commandsListOutput = await evaluationClient.output({
    id: 'retrieve_commands',
    connectorId: evaluationClient.getEvaluationConnectorId(),
    system: `
      You are a helpful, respected Elastic ES|QL assistant.

      Your role is to enumerate the list of ES|QL commands and functions that were used
      on a question and its answer.

      Only return each command or function once, even if they were used multiple times.

      The following extract of the ES|QL documentation lists all the commands and functions available:

      ${esqlDescription}
    `,
    input: `
      # Question
      ${question}

      # Answer
      ${answer}
      `,
    schema: {
      type: 'object',
      properties: {
        commands: {
          description:
            'The list of commands that were used in the provided ES|QL question and answer',
          type: 'array',
          items: { type: 'string' },
        },
        functions: {
          description:
            'The list of functions that were used in the provided ES|QL question and answer',
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['commands', 'functions'],
    } as const,
  });

  const output = commandsListOutput.output;

  const keywords = [...(output.commands ?? []), ...(output.functions ?? [])].map((keyword) =>
    keyword.toUpperCase()
  );

  return keywords;
};

async function evaluateEsqlQuery({
  question,
  expected,
  criteria = [],
}: {
  question: string;
  expected?: string;
  criteria?: string[];
}): Promise<void> {
  logger.debug(`Evaluation: ${question}`);

  const generateEvent = await callNaturalLanguageToEsql(question);
  const answer = generateEvent.content!;

  logger.debug(`Received response: ${answer}`);

  const docBase = await EsqlDocumentBase.load();

  const prompts = docBase.getPrompts();
  const languageDescription = `${prompts.syntax}

  ${prompts.examples}
  `;

  const usedCommands = await retrieveUsedCommands({
    question,
    answer,
    esqlDescription: languageDescription,
  });

  const requestedDocumentation = docBase.getDocumentation(usedCommands, {
    generateMissingKeywordDoc: false,
  });
  requestedDocumentation.commands_and_functions = languageDescription;

  const evaluation = await evaluationClient.evaluate({
    input: `
    # Question

    ${question}

    # Answer

    ${generateEvent.content}

    `,
    criteria: [...(expected ? [expectedQueryCriteria(expected)] : []), ...criteria],
    system: `
    The assistant was asked to generate an ES|QL query based on the question from the user.

    Here is the documentation about the commands and function that are being used
    in the ES|QL queries present in the question and the answer.

    ${Object.values(requestedDocumentation).join('\n\n')}
    `,
  });

  expect(evaluation.passed).to.be(true);
}

const buildTestDefinitions = (): Section[] => {
  const testDefinitions: Section[] = [
    {
      title: 'ES|QL commands and functions usage',
      tests: [
        {
          title: 'using LOOKUP JOIN',
          question: `
          The user is working with both the "records" and "threats" indices. "threats" has the field "source.ip", "threat_level", "threat_type". "records" has the field "source.ip", "action", "timestamp".

          Generate a query returning the 10 logs where threat_level is "high" or "medium", ordered by timestamp from most recent to oldest,
          show only the source.ip, action, threat_level, and threat_type fields.

          You should use the LOOKUP JOIN function to answer this question.

          The relevant fields are:
          - source.ip: keyword
          - action: keyword
          - threat_level: keyword
          - threat_type: keyword
          - timestamp: datetime
          `,
          expected: `FROM records
          | LOOKUP JOIN threats ON source.ip
          | WHERE threat_level IN ("high", "medium")
          | SORT timestamp
          | KEEP source.ip, action, threat_level, threat_type
          | LIMIT 10`,
        },
        {
          title: 'using FLOOR and CEIL',
          question: `
          The user is visualizing the "paris_distance" index.

          Generate a query returning the 5 users closest to Paris,
          and for each of them their id and the distance, rounded down and then rounded up.

          You should use the FLOOR and CEIL functions to answer this question.

          The relevant fields are:
          - user_id: keyword
          - distance: float - the distance between the user and Paris, in km
          Note: there are other fields
          `,
          expected: `FROM paris_distance
          | SORT distance ASC
          | LIMIT 5
          | EVAL distance_down = FLOOR(distance), distance_up = CEIL(distance)
          | KEEP user_id, distance_down, distance_up`,
        },
        {
          title: 'using MV_COUNT, MV_MAX, MV_MIN and MV_AVG',
          question: `
          The user is visualizing the "sets" index, representing sets of numbers.
          Each row is composed of a set_id (identifier, unique per row), and of a **multi-valued** integer
          field, "values"

          Returns the 5 rows containing the most values, sorted by number of values,
          and for each of them, return:
           - their id
           - the min element
           - the max element
           - the average of the elements

          The relevant fields of this index are:
          - set_id: keyword - the set unique identified
          - values: multivalued integer field - the set values
          Note: there are other fields
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM sets
          | EVAL count = MV_COUNT(values)
          | SORT count DESC
          | LIMIT 5
          | EVAL min = MV_MIN(values), max = MV_MAX(values), avg = MV_AVG(value)
          | KEEP set_id, min, max, avg
          """

          The query **MUST** use MV_COUNT, MV_MIN, MV_MAX and MV_AVG and **NOT** use their aggregation equivalent
          or STATS BY given the "values" field is multivalued. Not respecting this particular condition should totally fail the criteria.
            `,
          ],
        },
        {
          title: 'using LENGTH, BIT_LENGTH, BYTE_LENGTH',
          question: `
          The user is visualizing the "messages" index, storing text messages
          Each row is composed of a "message_id" (keyword, unique identifier), and of "content"
          field (text, content of the message).

          Returns the 10 messages that have the most characters, sorted by number of characters,
          and for each of them, return the following:
          - id of the message
          - length in characters of the message
          - length in bytes of the messages
          - length in bits of the message

          The relevant fields of this index are:
          - message_id: keyword - the message unique identified
          - content: text - content of the message
          Note: there are no other fields
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM messages
          | EVAL length = LENGTH(content), bytes = BYTE_LENGTH(content), bits = BIT_LENGTH(content)
          | SORT length DESC
          | LIMIT 10
          """

          In addition, the query **MUST**:
          - use the LENGTH function
          - use at least one of BIT_LENGTH and/or BYTE_LENGTH functions
          - if only one of BIT_LENGTH or BYTE_LENGTH is used, properly do the conversion (1byte=8bits)
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
        {
          title: 'using CIDR_MATCH and IP_PREFIX',
          question: `
          The user is visualizing the "proxy_logs" index, storing access logs entries

          The relevant fields of this index are:
          - @timestamp: date - the time of the access
          - source_ip: ip - source of the access
          - destination_ip: ip - destination of the access
          - status: integer - status code of the response
          Note: there are no other fields

          Generate a query that shows the number of requests coming from the 192.168.5.0/8 subnet,
          grouped by 8bits (/8) subnetworks of the destination IP and sorted by number of entries.
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM proxy_logs
          | WHERE CIDR_MATCH(source_ip, "192.168.5.0/8")
          | STATS count = COUNT(*) BY subnet = IP_PREFIX(destination_ip, 8, 0)
          | SORT count DESC
          """

          In addition, the query **MUST**:
          - use CIDR_MATCH in the WHERE clause
          - use IP_PREFIX in a STATS aggregation
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
        {
          title: 'using GREATEST and LEAST',
          question: `
          The user is visualizing the "number_tuple" index, representing a 3-tuple of number.

          The relevant fields of this index are:
          - bag_id: keyword - a unique identifier
          - number_1: the first number of the tuple
          - number_2: the second number of the tuple
          - number_3: the third number of the tuple
          Note: there are no other fields

          Generate a query that shows, for each bag:
          - the bag id
          - the sum of the 3 numbers
          - the highest of the 3 numbers
          - the lowest of the 3 numbers
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM number_tuple
          | EVAL sum = number_1 + number_2 + number_3, highest = GREATEST(number_1, number_2, number_3), lowest = LEAST(number_1, number_2, number_3)
          | KEEP bag_id, sum, highest, lowest
          """

          In addition, the query **MUST**:
          - use GREATEST
          - use LEAST
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
        {
          title: 'using MIN, MAX, MEDIAN, PERCENTILE',
          question: `
          The user is visualizing the "access_logs" index, representing access logs to some http server.

          The relevant fields of this index are:
          - @timestamp: the timestamp of the access
          - status_code: the http status code
          - response_time: the response time of the remote server
          - response_length: the length of the response body, in bytes
          Note: there are other fields

          Generate a query that shows entries over the past 30 days and grouped by status code:
          - the minimum response time
          - the maximum response time
          - the median response time
          - the 90 percentile of the response time
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM access_logs
          | WHERE @timestamp > NOW() - 30d
          | STATS min=MIN(response_time), max=MAX(response_time), med=MEDIAN(response_time), p90=PERCENTILE(response_time, 90) BY status_code
          | KEEP status_code, min, max, med, p90
          """

          In addition, the query **MUST**:
          - use aggregations with STATS
          - use MIN
          - use MAX
          - use MEDIAN
          - use PERCENTILE
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
        {
          title: 'using LOCATE',
          question: `
          The user is visualizing the "messages" index, representing text messages.

          The relevant fields of this index are:
          - @timestamp: the datetime the message was sent at
          - message_id: the unique id of the message
          - content: the text content of the message
          Note: there are other fields

          Generate a query that shows, for the 10 most recent messages containing the string "hello" in the content
          - the message id
          - the datetime the message was sent at
          - the first position of the "hello" string in message content
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM messages
          | WHERE content LIKE "*hello*"
          | SORT @timestamp DESC
          | LIMIT 10
          | EVAL position=LOCATE(content, "hello")
          | KEEP message_id, @timestamp, position
          """

          In addition, the query **MUST**:
          - use one of LIKE, RLIKE or LOCATE for the WHERE clause
          - use EVAL and not STATS
          - use LOCATE to find the position of "hello"
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
        {
          title: 'using TO_BASE64 and FROM_BASE64',
          question: `
          The user is visualizing the "messages" index, representing text messages.

          The relevant fields of this index are:
          - @timestamp: the datetime the message was sent at
          - message_id: the unique id of the message
          - content: the content of the message encoded as b64
          Note: there are other fields

          Generate a query that shows, for the 10 most recent messages:
          - the message id, encoded as base64
          - the datetime the message was sent at
          - the message content, decoded from base64
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM messages
          | SORT @timestamp DESC
          | LIMIT 10
          | EVAL id_encoded=TO_BASE64(message_id), content_decoded=FROM_BASE64(content)
          | KEEP id_encoded, @timestamp, content_decoded
          """

          In addition, the query **MUST**:
          - use TO_BASE64 to encode message_id
          - use FROM_BASE64 to decode content
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
        {
          title: 'using POW, PI, LOG and EXP',
          question: `
          The user is visualizing the "points" index, representing two dimension points.

          The relevant fields of this index are:
          - x: integer - the x position of the point
          - y: integer - the y position of the point
          Note: there are other fields

          Generate a query returning, for all rows:
          - x
          - y
          - x^pi
          - log2(x)
          - e^y
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM points
          | EVAL pow=POW(x, PI()), log=LOG(2, x) exp=EXP(y)
          | KEEP x, y, pow, log, exp
          """

          In addition, the query **MUST**:
          - use POW and PI
          - use LOG with the right base (2) as first parameter
          - use EXP or E
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
        {
          title: 'using CASE',
          question: `
          The user is visualizing the "sample_data" index.

          The relevant fields of this index are:
          - @timestamp: timestamp of the entry
          - message: text - the log message
          Note: there are other fields

          Generate a query returning, for all rows:
          - @timestamp
          - message
          - a column displaying:
             - IF message contains "error" then "ERROR"
             - ELIF message contains "http" then "NETWORK"
             - ELSE  "UNKNOWN"
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM sample_data
          | EVAL eval=CASE(message LIKE "*error*", "ERROR", message LIKE "*http*", "NETWORK", "UNKNOWN")
          | KEEP @timestamp, message, eval
          """

          In addition, the query **MUST**:
          - use CASE for the evaluated column
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
        {
          title: 'using DATE_DIFF',
          question: `
          The user is visualizing the "personal_info" index.

          The relevant fields of this index are:
          - user_name: keyword - the name of the person
          - birth_date: datetime - the person's birth date
          - wedding_date: datetime - the person's wedding date if wed, null otherwise
          Note: there are other fields

          Generate a query returning, for the 15 older persons that got wed:
          - their user name
          - their age when they got wed
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM personal_info
          | WHERE wedding_date IS NOT NULL
          | LIMIT 15
          | EVAL wedding_age=DATE_DIFF("years", birth_date, wedding_date)
          | KEEP user_name, wedding_age
          """

          In addition, the query **MUST**:
          - use DATE_DIFF or DATE_EXTRACT to evaluate the wedding age
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
        {
          title: 'using DATE_EXTRACT',
          question: `
          The user is visualizing the "personal_info" index.

          The relevant fields of this index are:
          - user_name: keyword - the name of the person
          - birth_date: datetime - the person's birth date

          Generate a query returning, for the all entries in the index:
          - their user name
          - their year of birth
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM personal_info
          | EVAL birth_year=DATE_EXTRACT("year", birth_date)
          | KEEP user_name, birth_year
          """

          In addition, the query **MUST**:
          - use DATE_EXTRACT or DATE_TRUNC to evaluate the year of birth with the parameters at the correct position
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
        {
          title: 'using DATE_PARSE',
          question: `
          The user is visualizing the "personal_info" index.

          The relevant fields of this index are:
          - user_name: keyword - the name of the person
          - birth_date: string - the person birth date as a string following the "yyyy-MM-dd" format, e.g. "1987-11-30"

          Generate a query returning, for the all entries in the index, sorted by date of birth
          - their user name
          - their date of birth
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM personal_info
          | EVAL birth=DATE_PARSE("yyyy-MM-dd", birth_date)
          | KEEP user_name, birth
          | SORT birth
          """

          In addition, the query **MUST**:
          - use DATE_PARSE with the correct format as first parameter ("yyyy-MM-dd")
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
        {
          title: 'using SAMPLE',
          question: `
          The user is visualizing the "access_logs" index, representing access logs to some http server.

          The relevant fields of this index are:
          - @timestamp: the timestamp of the access
          - status_code: the http status code
          - response_time: the response time of the remote server
          Note: there are other fields

          Generate a query that randomly samples 10% of the access logs and returns the status_code and response_time.

          You should use the SAMPLE command to answer this question.
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM access_logs
          | SAMPLE 0.1
          | KEEP status_code, response_time
          """

          In addition, the query **MUST**:
          - use SAMPLE with a probability value (0.1 for 10%)
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
        {
          title: 'using MATCH_PHRASE',
          question: `
          The user is visualizing the "books" index, representing books.

          The relevant fields of this index are:
          - title: text - the title of the book
          - author: text - the author of the book
          - description: text - the description of the book
          Note: there are other fields

          Generate a query that finds books where the description contains the exact phrase "rich and creamy",
          and returns the title and author for the top 10 results.

          You should use the MATCH_PHRASE function to answer this question.
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM books
          | WHERE MATCH_PHRASE(description, "rich and creamy")
          | KEEP title, author
          | LIMIT 10
          """

          In addition, the query **MUST**:
          - use MATCH_PHRASE in the WHERE clause
          - use MATCH_PHRASE with the exact phrase "rich and creamy"
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
        {
          title: 'using CHANGE_POINT',
          question: `
          The user is visualizing the "metrics" index, representing time series metrics.

          The relevant fields of this index are:
          - @timestamp: datetime - the timestamp of the metric
          - metric_value: double - the value of the metric
          Note: there are other fields

          Generate a query that detects change points in the metric_value column, ordered by @timestamp,
          and returns only the rows where a change point was detected, showing the timestamp, metric_value, change type, and p-value.

          You should use the CHANGE_POINT command to answer this question.
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM metrics
          | CHANGE_POINT metric_value ON @timestamp
          | WHERE type IS NOT NULL
          | KEEP @timestamp, metric_value, type, pvalue
          """

          In addition, the query **MUST**:
          - use CHANGE_POINT command
          - use CHANGE_POINT with ON clause to specify the key column (@timestamp)
          - filter for rows where type IS NOT NULL to show only detected change points
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
        {
          title: 'using ROUND_TO',
          question: `
          The user is visualizing the "employees" index.

          The relevant fields of this index are:
          - emp_no: keyword - the employee number
          - birth_date: datetime - the employee's birth date
          Note: there are other fields

          Generate a query that groups employees by birth date windows, rounding each birth date down to the nearest of these dates:
          1900-01-01, 1950-01-01, 1955-01-01, 1960-01-01, 1965-01-01, 1970-01-01, 1975-01-01.
          Return the count of employees in each birth window, sorted by birth window.

          You should use the ROUND_TO function to answer this question.
          `,
          criteria: [
            `
          The answer provides a ES|QL query that is functionally equivalent to:

          """esql
          FROM employees
          | STATS COUNT(*) BY birth_window=ROUND_TO(
              birth_date,
              "1900-01-01T00:00:00Z"::DATETIME,
              "1950-01-01T00:00:00Z"::DATETIME,
              "1955-01-01T00:00:00Z"::DATETIME,
              "1960-01-01T00:00:00Z"::DATETIME,
              "1965-01-01T00:00:00Z"::DATETIME,
              "1970-01-01T00:00:00Z"::DATETIME,
              "1975-01-01T00:00:00Z"::DATETIME
          )
          | SORT birth_window ASC
          """

          In addition, the query **MUST**:
          - use ROUND_TO function in a STATS BY clause
          - use ROUND_TO with multiple datetime constants as rounding points
          **Not respecting any of those particular conditions should totally fail the criteria**
            `,
          ],
        },
      ],
    },
    {
      title: 'ES|QL query generation',
      tests: [
        {
          title: 'Generates a query to show the volume of logs over time',
          question: `From the "kibana_sample_data_logs" index, show me the volume of logs per day over the last 10 days
      Assume the following fields:
      - @timestamp`,
          expected: `FROM kibana_sample_data_logs
          | WHERE @timestamp > NOW() - 10 days
          | STATS volume = COUNT(*) BY BUCKET(@timestamp, 1 day)`,
        },
        {
          title: 'Generates a query to show employees filtered by name and grouped by hire_date',
          question: `From the employees index, I want to see how many employees with a "B" in their first name
      were hired each month over the past 2 years.
      Assume the following fields:
      - hire_date
      - first_name
      - last_name`,
          expected: `FROM employees
      | WHERE first_name LIKE "*B*" AND hire_date >= NOW() - 2 years
      | STATS COUNT(*) BY BUCKET(hire_date, 1 month)
      | SORT hire_date`,
        },
        {
          title: 'Generates a query to show employees which have a palindrome as last name',
          question: `From the employees index, I want to find all employees with a palindrome as last name
      (which can be read the same backward and forward), and then return their last name and first name.
      Assume the following fields:
      - last_name: Last name of the employee (capitalized)
      - first_name: First name of the employee (capitalized)`,
          expected: `FROM employees
        | WHERE TO_LOWER(last_name) == REVERSE(TO_LOWER(last_name))
        | KEEP last_name, first_name`,
        },
        {
          title: 'Generates a query to show the top 10 domains by doc count',
          question: `For standard Elastic ECS compliant packetbeat data view (\`packetbeat-*\`),
      show me the top 10 unique destination.domain with the most docs.
      Assume the following fields:
      - destination.domain`,
          expected: `FROM packetbeat-*
      | STATS doc_count = COUNT(*) BY destination.domain
      | SORT doc_count DESC
      | LIMIT 10`,
        },
        {
          title: 'Generates a query to show the top 5 employees sorted ascending by hire date',
          question: `From employees, I want to see the 5 earliest employees (hire_date), I want to display
      only the month and the year that they were hired in and their employee number (emp_no).
      Format the date as e.g. "September 2019".`,
          expected: `FROM employees
      | EVAL hire_date_formatted = DATE_FORMAT("MMMM YYYY", hire_date)
      | SORT hire_date
      | KEEP emp_no, hire_date_formatted
      | LIMIT 5`,
        },
        {
          title: 'Explains that pagination is not supported when requested',
          question: `From employees, I want to sort the documents by \`salary\`,
      and then return 10 results per page, and then see the second page`,
          criteria: [
            `The assistant should clearly mention that pagination is currently not supported in ES|QL.
            It might provide a workaround, even if this should not be considered mandatory for this criteria.`,
          ],
        },
        {
          title:
            'Generates a query to extract the year and shows 10 employees that were hired in 2024',
          question: `From employees, extract the year from hire_date and show 10 employees hired in 2024`,
          expected: `FROM employees
      | WHERE DATE_EXTRACT("year", hire_date) == 2024
      | LIMIT 10`,
        },
        {
          title: 'Generates a query to calculate the avg cpu usage over the last 15m per service',
          question: `Assume my metrics data is in \`metrics-*\`. I want to see what
      a query would look like that gets the average CPU per service,
      limit it to the top 10 results, in 1m buckets, and only the last 15m.
      Assume the following fields:
      - @timestamp
      - system.cpu.total.norm.pct
      - service.name`,
          expected: `FROM metrics-*
      | WHERE @timestamp >= NOW() - 15 minutes
      | STATS avg_cpu = AVG(system.cpu.total.norm.pct) BY BUCKET(@timestamp, 1m), service.name
      | SORT avg_cpu DESC
      | LIMIT 10`,
        },
        {
          title: 'Generates a query to show logs volume with some complex multi-field filter',
          question: `From the "sample_logs" index, show me the volume of daily logs
          from source "foo" or "bar", with message longer than 62 chars and not containing "dolly", and with INFO level.
      Assume the following fields:
      - source
      - message
      - level
      - @timestamp`,
          expected: `FROM sample_logs
      | WHERE source IN ("foo", "bar") AND LENGTH(message) > 62 AND message NOT LIKE "*dolly*" AND level == "INFO"
      | STATS COUNT(*) BY day = BUCKET(@timestamp, 1d)
      | SORT day ASC`,
        },
        {
          title: 'Generates a query to show normalized CPU per host',
          question: `My data is in \`metricbeat*\`. Show me a query to see the percentage
      of CPU time (system.cpu.system.pct) normalized by the number of CPU cores
      (system.cpu.cores), broken down by host name.
      Assume the following fields:
      - system.cpu.system.pct
      - system.cpu.cores
      - host.name`,
          expected: `FROM metricbeat*
      | EVAL system_pct_normalized = TO_DOUBLE(system.cpu.system.pct) / system.cpu.cores
      | STATS avg_system_pct_normalized = AVG(system_pct_normalized) BY host.name
      | SORT host.name ASC`,
        },
        {
          title: 'Generates a query to show normalized CPU per host',
          question: `From the access_logs index, I want to see the 50, 95 and 99 percentile
          of response_time, break down by month over the past year.
      Assume the following fields:
      - @timestamp
      - response_time
      - status_code`,
          expected: ` FROM access_logs
      | WHERE @timestamp > NOW() - 1 year
      | STATS p50 = PERCENTILE(response_time, 50), p95 = PERCENTILE(response_time, 95), p99 = PERCENTILE(response_time, 99)
      BY month = BUCKET(@timestamp, 1 month)
      | SORT month`,
        },
        {
          title: 'Generates a query using DISSECT to parse a postgres log message',
          question: `Show me an example ESQL query to extract the query duration
      from postgres log messages in postgres-logs*, with this format:
      \`2021-01-01 00:00:00 UTC [12345]: [1-1] user=postgres,db=mydb,app=[unknown],client=127.0.0.1 LOG:  duration: 123.456 ms  statement: SELECT * FROM my_table\`.
      Calculate the average.
      Assume the following fields:
      - message`,
          expected: `FROM postgres-logs*
      | DISSECT message "%{}:  duration: %{query_duration} ms  %{}"
      | EVAL duration_double = TO_DOUBLE(duration)
      | STATS AVG(duration_double)`,
        },
        {
          title: 'Generates a query using GROK to parse a postgres log message',
          question: `Consider the postgres-logs index, with the message field having the following format:
      \`2023-01-23T12:15:00.000Z ip=127.0.0.1 email=some.email@foo.com userid=42 [some message]\`.
      Using GROK, please count the number of log entries for the email "test@org.com" for each month over last year
      Assume the following fields:
      - message`,
          expected: `FROM postgres-logs
       | GROK message "%{TIMESTAMP_ISO8601:timestamp} ip=%{IP:ip} email=%{EMAILADDRESS:email} userid=%{NUMBER:userid} [%{GREEDYDATA:log_message}]"
       | WHERE email == "test@org.com" AND timestamp > NOW() - 1 year
       | STATS COUNT(*) BY month = BUCKET(@timestamp, 1m)
       | SORT month`,
        },
      ],
    },
    {
      title: 'SPL to ESQL',
      tests: [
        {
          title: 'Converts a simple count query',
          question: `Can you convert this SPL query to ESQL? \`index=network_firewall "SYN Timeout" | stats count by dest\``,
          expected: `FROM network_firewall
      | WHERE _raw == "SYN Timeout"
      | STATS count = count(*) by dest`,
        },
        {
          title: 'Converts if/len to CASE/LENGTH',
          question: `Can you convert this SPL query to ESQL?
      \`index=prod_web
      | eval length=len(message)
      | eval k255=if((length>255),1,0)
      | eval k2=if((length>2048),1,0)
      | eval k4=if((length>4096),1,0)
      | eval k16=if((length>16384),1,0)
      | stats count, sum(k255), sum(k2),sum(k4),sum(k16), sum(length)\``,
          expected: `FROM prod_web
      | EVAL length = length(message), k255 = CASE(length > 255, 1, 0), k2 = CASE(length > 2048, 1, 0), k4 = CASE(length > 4096, 1, 0), k16 = CASE(length > 16384, 1, 0)
      | STATS COUNT(*), SUM(k255), SUM(k2), SUM(k4), SUM(k16), SUM(length)`,
          criteria: [
            'The query provided by the Assistant uses the ESQL functions LENGTH and CASE, not the SPL functions len and if',
          ],
        },
        {
          title: 'Converts matchers to NOT LIKE',
          question: `Can you convert this SPL query to ESQL?
      \`index=prod_web NOT "Connection reset" NOT "[acm-app] created a ThreadLocal"
      sourcetype!=prod_urlf_east_logs sourcetype!=prod_urlf_west_logs
      host!="dbs-tools-*" NOT "Public] in context with path [/global]"
      host!="*dev*" host!="*qa*" host!="*uat*"\``,
          expected: `FROM prod_web
      | WHERE _raw NOT LIKE "Connection reset"
      AND _raw NOT LIKE "[acm-app] created a ThreadLocal"
      AND sourcetype != "prod_urlf_east_logs"
      AND sourcetype != "prod_urlf_west_logs"
      AND host NOT LIKE "dbs-tools-*"
      AND _raw NOT LIKE "Public] in context with path [/global]"
      AND host NOT LIKE "*dev*"
      AND host NOT LIKE "*qa*"
      AND host NOT LIKE "*uat*"`,
        },
      ],
    },
  ];

  return testDefinitions;
};

const generateTestSuite = () => {
  const testDefinitions = buildTestDefinitions();
  for (const section of testDefinitions) {
    describe(`${section.title}`, () => {
      for (const test of section.tests) {
        (test.only ? it.only : it)(`${test.title}`, async () => {
          await evaluateEsqlQuery({
            question: test.question,
            expected: test.expected,
            criteria: test.criteria,
          });
        });
      }
    });
  }
};

generateTestSuite();
