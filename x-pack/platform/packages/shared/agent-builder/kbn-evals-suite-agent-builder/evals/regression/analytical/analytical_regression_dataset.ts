/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Regression dataset for the analytical-queries capability, curated from
 * `agent_builder_analytical_queries_v2` (24 examples spanning the four corpus
 * domains, tiered simple/medium/hard/ambiguous).
 *
 * Source of truth for curation decisions (row provenance, overrides, reviewer notes):
 * `configs/evaluation/datasets/golden/analytical_queries_v2_golden_picks.yaml` in the
 * internal `orca` repo. Reviewer notes are kept as code comments and intentionally NOT
 * included in example metadata: metadata is passed to LLM judges and the notes
 * contain grading hints that would leak.
 *
 * Index names in `esqlQueries` are normalized to the names restored by the
 * `analytical_datasets_multi_domain` snapshot (the source CSV prefixes some of them,
 * e.g. `airline_loyalty_customer_loyalty_history` for `customer_loyalty_history`).
 *
 * `metadata.criteria` entries are example-specific grading criteria carried over from
 * curation; no evaluator consumes them yet. Examples in the `ambiguous` tier are
 * deliberately underspecified and expect the agent to state an interpretation rather
 * than ask for clarification.
 */

import type { Example } from '@kbn/evals';

export interface AnalyticalRegressionExample extends Example {
  input: { question: string };
  output: {
    expected: string;
    /** Reference ES|QL queries that produce the expected answer from the corpus. */
    esqlQueries: string[];
  };
  metadata: {
    queryId: string;
    /** 0-based data row in the source CSV; null for hand-authored examples. */
    sourceRow: number | null;
    tier: 'simple' | 'medium' | 'hard' | 'ambiguous';
    criteria?: string[];
  };
}

export const ANALYTICAL_REGRESSION_DATASET: {
  name: string;
  description: string;
  examples: AnalyticalRegressionExample[];
} = {
  name: 'agent builder: regression-analytical-queries',
  description:
    'Fixed regression dataset for analytical/ES|QL queries over the analytical_datasets_multi_domain corpus. 24 curated examples tiered by difficulty.',
  examples: [
    // airline_analytical_1 | simple
    {
      input: {
        question:
          'What is the loyalty card status and CLV for the customer with loyalty number 914255?',
      },
      output: {
        expected:
          'The customer with loyalty number 914255 has:\n\nLoyalty Card Status: Star\nCLV (Customer Lifetime Value): $4,217.86',
        esqlQueries: [
          'FROM customer_loyalty_history\n| WHERE `Loyalty Number` == "914255"\n| KEEP `Loyalty Card`, CLV',
        ],
      },
      metadata: {
        queryId: 'airline_analytical_1',
        sourceRow: 78,
        tier: 'simple',
      },
    },
    // airline_analytical_6 | medium
    {
      input: {
        question: 'Give a breakdown of average CLV of our loyalty members by marital status.',
      },
      output: {
        expected:
          'Average CLV by marital status:\n\n| Marital Status | Average CLV |\n|----------------|-------------|\n| Divorced       | $8,200.69   |\n| Married        | $8,058.20   |\n| Single         | $7,719.49   |\n\nDivorced members have the highest average CLV.',
        esqlQueries: [
          'FROM customer_loyalty_history\n| STATS avg_clv = AVG(CLV) BY `Marital Status`',
        ],
      },
      metadata: {
        queryId: 'airline_analytical_6',
        sourceRow: 83,
        tier: 'medium',
      },
    },
    // airline_analytical_23 | medium
    // note: Override replaces customers with loyalty members to avoid routing to the retail customers index.
    {
      input: {
        question:
          'Across all our loyalty members earning at least 120,000 in salary, which province shows the highest churn rate? By churn rate, I mean the percentage of these members who have actually cancelled their membership (i.e., have a non-null cancellation year) out of the total number of members in that province.',
      },
      output: {
        expected:
          'Among customers earning $120,000 or more, Saskatchewan shows the highest churn rate at 20%, with 2 out of 10 customers having cancelled their membership.\n\nChurn by province (high-income customers):\n\nProvince                   | Total Customers | Churned | Churn Rate\n---------------------------|-----------------|---------|-----------\nSaskatchewan               | 10              | 2       | 20.00%\nNew Brunswick              | 37              | 7       | 18.92%\nQuebec                     | 146             | 27      | 18.49%\nAlberta                    | 30              | 5       | 16.67%\nYukon                      | 7               | 1       | 14.29%\nOntario                    | 218             | 23      | 10.55%\nBritish Columbia           | 186             | 17      | 9.14%\nManitoba                   | 22              | 2       | 9.09%\nNova Scotia                | 16              | 1       | 6.25%\nNewfoundland               | 7               | 0       | 0.00%\nPrince Edward Island       | 2               | 0       | 0.00%',
        esqlQueries: [
          'FROM customer_loyalty_history\n| WHERE Salary >= 120000\n| STATS total_count = COUNT(*), churned_count = COUNT(`Cancellation Year`) BY Province\n| EVAL churn_rate = TO_DOUBLE(churned_count) / total_count\n| SORT churn_rate DESC',
        ],
      },
      metadata: {
        queryId: 'airline_analytical_23',
        sourceRow: 100,
        tier: 'medium',
      },
    },
    // airline_analytical_32 | hard
    {
      input: {
        question:
          'Start with customer 823048 (Loyalty Number). Find the City they live in. Next, identify the member with the highest CLV who lives in that same City. Finally, calculate the Average Salary of all members who enrolled in that specific year.',
      },
      output: {
        expected:
          '## Additional Info:\n1. Customer 823048 lives in Vancouver\n\n2. Highest CLV member in Vancouver: Loyalty Number 776187\n   - CLV: $74,228.52\n   - Enrollment Year: 2014\n   - Loyalty Card: Star\n   - Education: College\n\n## Answer\n3. Average Salary of all members enrolled in 2014: $81,254.40',
        esqlQueries: [
          'FROM customer_loyalty_history\n| WHERE `Loyalty Number` == "823048"\n| KEEP `Loyalty Number`, City',
          'FROM customer_loyalty_history\n| WHERE City == "Vancouver"\n| SORT CLV DESC\n| LIMIT 1',
          'FROM customer_loyalty_history\n| WHERE `Enrollment Year` == 2014\n| STATS avg_salary = AVG(Salary)',
        ],
      },
      metadata: {
        queryId: 'airline_analytical_32',
        sourceRow: 109,
        tier: 'hard',
      },
    },
    // airline_analytical_29 | hard
    // note: Winter = Jan, Feb, Dec of 2017 (same year). Months are named explicitly in the question, so the same-year reading is intended.
    {
      input: {
        question:
          'Identify the Loyalty Numbers of members who were active (flights > 0) in both Summer (June, July, August) AND Winter (Dec, Jan, Feb) of 2017, but did NOT take any flights in Spring (March, April, May). Return the count of such members',
      },
      output: {
        expected:
          'There are 932 members who were active in both the Summer and Winter of 2017 but did not take any flights during the Spring of that year.',
        esqlQueries: [
          'FROM customer_flight_activity\n| WHERE Year == 2017\n| STATS summer_flights = SUM(`Total Flights`) WHERE Month IN (6, 7, 8), winter_flights = SUM(`Total Flights`) WHERE Month IN (1, 2, 12), spring_flights = SUM(`Total Flights`) WHERE Month IN (3, 4, 5) BY `Loyalty Number`\n| WHERE summer_flights > 0 AND winter_flights > 0 AND COALESCE(spring_flights, 0) == 0\n| STATS count = COUNT(*)',
        ],
      },
      metadata: {
        queryId: 'airline_analytical_29',
        sourceRow: 106,
        tier: 'hard',
      },
    },
    // handauthored_airline_ambiguous | ambiguous
    // note: Deliberately underspecified ('active'); HITL/clarification must be disabled so the agent must pick and state an interpretation. Accept non-cancelled (14,670) or flew-in-2018 (14,614) when the definition is stated; partial credit for flew-in-Dec-2018 (8,742). COUNT_DISTINCT on Loyalty Number is approximate (gives 14,494 for 2018); exact count needs STATS BY then COUNT. Inspired by rows 91, 104, 105.
    {
      input: { question: 'How many active loyalty members do we have?' },
      output: {
        expected:
          '"Active" is not defined in the data, so the most common interpretation is used: members who have not cancelled their loyalty membership (no Cancellation Year).\n\nActive loyalty members: 14,670 out of 16,737 total members (2,067 have cancelled).\n\nAlternative interpretation: if "active" means members who took at least one flight in the most recent year of data (2018), the count is 14,614.',
        esqlQueries: [
          'FROM customer_loyalty_history\n| STATS total_members = COUNT(*), active_members = COUNT(*) WHERE `Cancellation Year` IS NULL',
          'FROM customer_flight_activity\n| WHERE Year == 2018 AND `Total Flights` > 0\n| STATS flights = SUM(`Total Flights`) BY `Loyalty Number`\n| STATS active_members = COUNT(*)',
        ],
      },
      metadata: {
        queryId: 'handauthored_airline_ambiguous',
        sourceRow: null,
        tier: 'ambiguous',
        criteria: [
          "States explicitly how 'active' was interpreted (e.g. not cancelled, or flew in the most recent year).",
          'Gives a single concrete count for the stated interpretation rather than refusing or asking for clarification.',
        ],
      },
    },
    // customer_suppport_analytical_1 | simple
    // note: Override avoids 'signup' being read as airline loyalty enrollment or a retail customer. created_at is stored in UTC.
    {
      input: {
        question:
          'When did the user with email tina.jackson@gray-smith.com create their account on our platform?',
      },
      output: {
        expected:
          'tina.jackson@gray-smith.com created their account on Oct 23, 2024 at 05:42:03 UTC.',
        esqlQueries: [
          'FROM users\n| WHERE email == "tina.jackson@gray-smith.com"\n| KEEP created_at',
        ],
      },
      metadata: {
        queryId: 'customer_suppport_analytical_1',
        sourceRow: 0,
        tier: 'simple',
      },
    },
    // customer_suppport_analytical_29 | medium
    // note: Date filter is effectively a no-op (earliest ticket 2024-04-24). 359 tickets match; index has 360 (one null created_at), so 360 is acceptable if the agent drops the filter.
    {
      input: {
        question:
          'Give me a breakdown of support tickets by priority and status, created since Q2 2024',
      },
      output: {
        expected:
          'Normal Priority (207 tickets)\n\nClosed: 140\nOpen: 47\nPending: 20\n\nHigh Priority (69 tickets)\n\nClosed: 45\nOpen: 15\nPending: 9\n\nUrgent Priority (50 tickets)\n\nClosed: 29\nOpen: 16\nPending: 5\n\nLow Priority (33 tickets)\n\nClosed: 25\nOpen: 6\nPending: 2\n\nTotal: 359 tickets created since Q2 2024, with the majority being normal priority tickets. Across all priorities, approximately 67% of tickets have been closed, 23% remain open, and 10% are pending.',
        esqlQueries: [
          'FROM support_ticket\n| WHERE created_at >= "2024-04-01T00:00:00Z"\n| STATS ticket_count = COUNT(*) BY priority, status\n| SORT priority, status',
        ],
      },
      metadata: {
        queryId: 'customer_suppport_analytical_29',
        sourceRow: 28,
        tier: 'medium',
      },
    },
    // customer_suppport_analytical_3 | medium
    // note: Date filter is discriminating (unfiltered winner differs: 55d6da95-...). Data ends 2024-10-23 (145 days in range). Winner avg 7.66 vs runner-up 7.36. Must use error_count, not error_rate.
    {
      input: {
        question:
          'What is the id of the project with highest daily average error count between Jun 2024 to Dec 2024',
      },
      output: {
        expected:
          'The project with the highest daily average error count between June and December 2024 is 5ed20eb2-4b16-422e-95ea-e2357378a2fa, with an average of about 7.66 errors per day.\n\nError data in this range only runs from June 1 to October 23, 2024 (145 days), as there is no data after October 23, 2024.',
        esqlQueries: [
          'FROM error_rate_daily\n| WHERE date >= "2024-06-01" AND date <= "2024-12-31"\n| STATS avg_daily_errors = AVG(error_count) BY project_id\n| SORT avg_daily_errors DESC\n| LIMIT 1\n| KEEP project_id',
        ],
      },
      metadata: {
        queryId: 'customer_suppport_analytical_3',
        sourceRow: 2,
        tier: 'medium',
      },
    },
    // customer_suppport_analytical_23 | hard
    // note: Leading/false-premise phrasing: agent must refute the claimed drop, not confirm it. Two changelog entries; the relevant change is the 2023-12-30 upgrade. Change day excluded from both windows; allow ~±0.5 drift in averages if boundaries differ, score mainly on the conclusion.
    {
      input: {
        question:
          'Can you confirm that the usage of the project with id e42cf744-bf65-4b3b-aa23-e946c69c1663 dropped after the changes to its plan? Compare the average daily requests from 90 days before to 90 days after the change.',
      },
      output: {
        expected:
          "No, this cannot be confirmed. The usage did not drop after the plan change; it increased.\n\nThe project's plan was upgraded on December 30, 2023 (the earlier changelog entry on January 11, 2023 is the initial plan assignment, not a change). Comparing the 90-day periods before and after the upgrade:\n\n- 90 days before (Oct 1 - Dec 29, 2023): 147.54 average daily requests\n- 90 days after (Dec 31, 2023 - Mar 29, 2024): 156.04 average daily requests\n\nThis is an increase of approximately 8.5 requests per day, or about 5.8% higher usage following the plan upgrade.",
        esqlQueries: [
          'FROM project_plan_changelogs\n| WHERE project_id == "e42cf744-bf65-4b3b-aa23-e946c69c1663"',
          'FROM requests_daily_count\n| WHERE project_id == "e42cf744-bf65-4b3b-aa23-e946c69c1663"\n| WHERE (date >= "2023-10-01T00:00:00Z" AND date <= "2023-12-29T23:59:59Z") OR (date >= "2023-12-31T00:00:00Z" AND date <= "2024-03-29T23:59:59Z")\n| EVAL period = CASE(\n    date < "2023-12-30T00:00:00Z", "before",\n    "after"\n  )\n| STATS average_daily_requests = AVG(request_count) BY period\n| SORT period',
        ],
      },
      metadata: {
        queryId: 'customer_suppport_analytical_23',
        sourceRow: 22,
        tier: 'hard',
        criteria: [
          'Does not confirm the claimed usage drop; states that usage increased after the plan change.',
          'Identifies the December 30, 2023 plan upgrade as the change, not the January 11, 2023 initial plan assignment.',
        ],
      },
    },
    // customer_suppport_analytical_17 | hard
    // note: Answer first (raw totals: sweet-aardvark-1347, +65), then surface data problems: partial months (created Sep 18; data ends Oct 23 -> daily-average winner is jolly-lemur-9740) and deleted projects with post-deletion requests. Full marks require the correct answer plus at least the partial-period caveat; penalize silently switching the answer to daily averages without stating the raw-total result.
    {
      input: {
        question:
          'Today is October 31, 2024. My name is Herbert Thompson. Which of my projects had the largest increase in total requests this month compared to last month?',
      },
      output: {
        expected:
          'Project with the largest increase in total requests: sweet-aardvark-1347 (ID: 6dedf5bb-933b-4b27-a6af-a5ac28573cf0)\n- September 2024: 607 requests\n- October 2024: 672 requests\n- Increase: +65 requests (+10.7%)\n\nOnly one other project increased: jolly-lemur-9740 (1,000 -> 1,006, +6). All other projects declined.\n\nData caveats that affect this comparison:\n1. Partial periods: sweet-aardvark-1347 was created on September 18, 2024, so September covers only 13 days of data. Request data also ends on October 23, 2024, so October covers only 23 days for every project. On a daily-average basis sweet-aardvark-1347 actually declined (46.7 -> 29.2 requests/day), and jolly-lemur-9740 shows the largest increase (33.3 -> 43.7 requests/day).\n2. Deleted projects with activity: proud-pelican-7085 was deleted on June 9, 2023 but still has request records in September (1,241) and October (815) 2024; jolly-kangaroo-7342 was deleted on September 26, 2024 but has request records in October 2024 (134). These records are inconsistent with the deletion dates and should be investigated.',
        esqlQueries: [
          'FROM users\n| WHERE first_name == "Herbert" AND last_name == "Thompson"\n| KEEP id, email',
          'FROM projects\n| WHERE owner_id == "4d23ecb2-1ea9-43d4-b68a-6c36a73bd94d"\n| KEEP id, name, created_at, deleted_at',
          'FROM requests_daily_count\n| WHERE project_id IN ("29461774-9586-4eb4-8401-3584d6d78481", "8075c5e8-f92c-4d27-84da-11c6ea83faa4", "9c562378-3f3b-456d-b396-1a7f7eaa23c7", "50e38b95-b184-4b7a-8288-d09ad35a163c", "059f3e06-0095-4588-9824-867a14ead3e9", "6dedf5bb-933b-4b27-a6af-a5ac28573cf0", "f3500ac6-4a4e-4c05-89cc-67df201775ad", "fcab07ac-9445-444c-8bfe-b687524d8cf8")\n| WHERE date >= "2024-09-01T00:00:00Z" AND date < "2024-11-01T00:00:00Z"\n| STATS total_requests = SUM(request_count), days = COUNT(*) BY project_id, month = BUCKET(date, 1 month)\n| SORT project_id, month',
        ],
      },
      metadata: {
        queryId: 'customer_suppport_analytical_17',
        sourceRow: 16,
        tier: 'hard',
        criteria: [
          'Answers with sweet-aardvark-1347 (+65 requests) based on total requests before giving any caveats.',
          'Mentions that the months are not comparable in length: sweet-aardvark-1347 was created on September 18, 2024 and/or request data ends on October 23, 2024.',
          'Mentions that one or more deleted projects still have request records after their deletion date.',
        ],
      },
    },
    // handauthored_customer_support_ambiguous | ambiguous
    // note: Deliberately underspecified ('best'). Closure rate, avg and median first response all pick Robert Hart (1454); only ticket volume picks Patrick Montoya (6056, 39 tickets); closed count ties 1454/6056 at 26. first_response_time is a timestamp, not a duration: needs DATE_DIFF(created_at, first_response_time). Excludes unassigned tickets.
    {
      input: { question: 'Which support agent is performing the best?' },
      output: {
        expected:
          '"Performing the best" can be measured in several ways; by ticket closure rate, the top performer is Robert Hart (agent ID 1454): 26 of 33 assigned tickets closed (78.79%), the highest among the 10 agents. He also has the fastest first response time (31.67 hours on average, 25.2 hours median).\n\nRunner-up on closure rate: Melissa Kelley (7913) at 75.76%. If measured by workload instead, Patrick Montoya (6056) handled the most tickets (39) and ties Robert Hart for the most closed tickets (26).',
        esqlQueries: [
          'FROM support_ticket\n| WHERE assignee_id IS NOT NULL\n| EVAL frt_hours = DATE_DIFF("minute", created_at, first_response_time) / 60.0\n| STATS total = COUNT(*), closed = COUNT(*) WHERE status == "closed", avg_frt_h = ROUND(AVG(frt_hours), 2), med_frt_h = ROUND(MEDIAN(frt_hours), 2) BY assignee_id\n| EVAL closure_rate = ROUND(TO_DOUBLE(closed) * 100 / total, 2)\n| SORT closure_rate DESC',
          'FROM support_user\n| WHERE role == "agent"\n| KEEP id, email',
        ],
      },
      metadata: {
        queryId: 'handauthored_customer_support_ambiguous',
        sourceRow: null,
        tier: 'ambiguous',
        criteria: [
          "States which metric(s) were used to define 'performing the best'.",
          'Names a single agent as the answer rather than refusing or asking for clarification.',
        ],
      },
    },
    // retail_analytical_12 | simple
    // note: Only online orders (StoreKey 0) have a Delivery Date (13,165 of 62,884 sales rows).
    {
      input: {
        question:
          'For order number 399004, has it already been delivered, and if so, how many days did it take from order date to delivery date?',
      },
      output: {
        expected:
          'Yes, order 399004 has been delivered. It was an online order (StoreKey 0), placed on February 3, 2016 and delivered on February 11, 2016, so delivery took 8 days.',
        esqlQueries: [
          'FROM sales\n| WHERE `Order Number` == "399004"\n| KEEP `Order Number`, `Order Date`, `Delivery Date`',
        ],
      },
      metadata: {
        queryId: 'retail_analytical_12',
        sourceRow: 47,
        tier: 'simple',
      },
    },
    // retail_analytical_40 | medium
    // note: Second part is non-discriminating: every non-Fabrikam brand qualifies.
    {
      input: {
        question:
          'What is the average unit price (in USD) of Fabrikam products, and which other brands have at least one product priced lower than that average?',
      },
      output: {
        expected:
          "The average 'Unit Price USD' for products in the Fabrikam brand is approximately $619.78 (267 products).\n\nAll 10 other brands have at least one product priced lower than that average:\n\n| Brand                | Products below $619.78 | Total products |\n|----------------------|------------------------|----------------|\n| A. Datum             | 127                    | 132            |\n| Adventure Works      | 138                    | 192            |\n| Contoso              | 620                    | 710            |\n| Litware              | 200                    | 264            |\n| Northwind Traders    | 27                     | 47             |\n| Proseware            | 211                    | 244            |\n| Southridge Video     | 183                    | 192            |\n| Tailspin Toys        | 144                    | 144            |\n| The Phone Company    | 152                    | 152            |\n| Wide World Importers | 138                    | 173            |",
        esqlQueries: [
          'FROM products\n| WHERE Brand == "Fabrikam"\n| STATS AVG(`Unit Price USD`)',
          'FROM products\n| WHERE Brand != "Fabrikam" AND `Unit Price USD` < 619.77666659123\n| STATS count = COUNT(*) BY Brand\n| KEEP Brand\n| SORT Brand',
        ],
      },
      metadata: {
        queryId: 'retail_analytical_40',
        sourceRow: 75,
        tier: 'medium',
      },
    },
    // retail_analytical_37 | medium
    // note: Source ES|QL returned one row per (store, quarter); override dedups with STATS BY StoreKey. Shortcut trap: listing all US/CA stores gives 29 (stores 7, 11, 46, 52, 58, 60 have no sales). Online store has EUR orders in all 21 quarters.
    {
      input: {
        question:
          'Which StoreKeys have sold products with Currency Code USD or CAD in the same quarter, but did not process any orders in EUR that quarter?',
      },
      output: {
        expected:
          'There are exactly 23 unique StoreKeys that meet your criteria:\n\n8, 9, 10, 43, 44, 45, 47, 48, 49, 50, 51, 53, 54, 55, 56, 57, 59, 61, 62, 63, 64, 65, 66.\n\nThese are all of the US and Canada physical stores that have sales. The Online store (StoreKey 0) is excluded because it processes EUR orders in every quarter.',
        esqlQueries: [
          'FROM sales\n| STATS usd_cad_sales = COUNT(*) WHERE `Currency Code` IN ("USD", "CAD"), eur_sales = COUNT(*) WHERE `Currency Code` == "EUR" BY StoreKey, quarter = BUCKET(`Order Date`, 1 quarter)\n| WHERE usd_cad_sales > 0 AND eur_sales == 0\n| STATS BY StoreKey\n| SORT StoreKey',
        ],
      },
      metadata: {
        queryId: 'retail_analytical_37',
        sourceRow: 72,
        tier: 'medium',
      },
    },
    // retail_analytical_5 | hard
    // note: False premise. Reference ProductKey range 1827-2487 equals exactly the 661 Home Appliances products. 'Last calendar year' from Feb 11, 2017 = 2016.
    {
      input: {
        question:
          "Today is Feb 11, 2017. Is it true that our New Mexico state stores sold more units of the 'Home Appliances' category than our Nevada stores in the last calendar year? What was the net difference in units sold?",
      },
      output: {
        expected:
          'No, that is not true. In calendar year 2016, your Nevada store sold 104 units of Home Appliances, while your New Mexico store sold 72 units. Nevada actually outperformed New Mexico in this category by 32 units. Each state has one store (Nevada: StoreKey 55, New Mexico: StoreKey 57).',
        esqlQueries: [
          'FROM stores\n| WHERE State == "New Mexico" OR State == "Nevada"\n| KEEP State, StoreKey',
          'FROM products\n| WHERE Category == "Home Appliances"\n| KEEP ProductKey',
          'FROM sales\n| WHERE StoreKey IN ("55", "57") \n  AND TO_INTEGER(ProductKey) >= 1827 \n  AND TO_INTEGER(ProductKey) <= 2487 \n  AND DATE_EXTRACT("year", `Order Date`) == 2016\n| STATS total_quantity = SUM(Quantity) BY StoreKey',
        ],
      },
      metadata: {
        queryId: 'retail_analytical_5',
        sourceRow: 40,
        tier: 'hard',
        criteria: [
          'Does not confirm the claim; states that Nevada sold more Home Appliances units than New Mexico in 2016.',
        ],
      },
    },
    // retail_analytical_1 | hard
    // note: Currency trap: order is in CAD but Unit Price USD is already USD, so no exchange-rate conversion is needed. Question says 'she' but customers lists Jonathon Moore as Male. Customer also has a Dec 2020 order, excluded by the 2018 filter.
    {
      input: {
        question:
          'For customer Jonathon Moore CustomerKey 204149 what is the total amount she spent in 2018 in USD, broken down by product category?',
      },
      output: {
        expected:
          "For customer Jonathon Moore (CustomerKey 204149), total 2018 spend was $105.98 USD, all from one order (#1305006, July 28, 2018):\n\n- Cameras and camcorders: $73.98 (2 x Contoso Multi-Use Terminal Cable E308 Silver at $36.99)\n- Games and Toys: $32.00 (1 x MGS MechCollection2009 E156 at $32.00)\n\nThe order was placed in CAD; amounts are based on the products' USD unit prices.",
        esqlQueries: [
          'FROM sales\n| WHERE CustomerKey == "204149" AND DATE_EXTRACT("year", `Order Date`) == 2018\n| KEEP ProductKey, Quantity\n| LIMIT 100',
          'FROM products\n| WHERE ProductKey == "1800" OR ProductKey == "1260"\n| KEEP ProductKey, Category, `Unit Price USD`',
        ],
      },
      metadata: {
        queryId: 'retail_analytical_1',
        sourceRow: 36,
        tier: 'hard',
      },
    },
    // retail_analytical_13 | ambiguous
    // note: Premise/data mismatch: question date (Dec 19) has no orders; order #1085003 is dated 2017-12-20. Stays ambiguous only while indexed data keeps Dec 20 (see source_issues row 48). Order paid in EUR; question override asks for USD to avoid exchange-rate divergence.
    {
      input: {
        question:
          'A customer claims she was charged twice for the same product on Dec 19, 2017. For customer Gaetana Greece (CustomerKey: 790329), list all orders on that date, their line items with product names, quantities, and line totals in USD, and identify if any product appears more than once across those orders.',
      },
      output: {
        expected:
          'There are no orders on December 19, 2017 for customer Gaetana Greece (CustomerKey 790329). The closest order is #1085003 on December 20, 2017, her only order in December 2017:\n\n| Line | Product Name                                    | Quantity | Unit Price (USD) | Line Total (USD) |\n|------|-------------------------------------------------|----------|------------------|------------------|\n| 1    | Adventure Works LCD15 E100 Black                | 5        | $99.00           | $495.00          |\n| 2    | The Phone Company PDA Palm 3.7 inch M830 Silver | 9        | $299.00          | $2,691.00        |\n| 3    | Contoso DVD Recorder L210 Silver                | 8        | $219.00          | $1,752.00        |\n| 4    | SV Hand Games women M40 Silver                  | 6        | $8.88            | $53.28           |\n| 5    | WWI 1GB Digital Voice Recorder Pen E100 Black   | 3        | $156.00          | $468.00          |\n| 6    | WWI 1GB Pulse Smart Pen E50 White               | 1        | $149.95          | $149.95          |\n| 7    | Contoso DVD 55DVD Storage Binder M56 Black      | 3        | $12.66           | $37.98           |\n\nOrder total: $5,647.21 USD (placed in EUR; amounts based on USD unit prices).\n\nNo product appears more than once. All 7 line items are different products, and there is no other order on December 19 or 20, so there is no evidence of a duplicate charge.',
        esqlQueries: [
          'FROM sales\n| WHERE CustomerKey == "790329" AND `Order Date` >= "2017-12-01" AND `Order Date` < "2018-01-01"\n| KEEP `Order Number`, `Order Date`, `Line Item`, ProductKey, Quantity, `Currency Code`',
          'FROM products\n| WHERE ProductKey IN ("499", "1551", "1623", "1706", "57", "46", "1631")\n| KEEP ProductKey, `Product Name`, `Unit Price USD`',
        ],
      },
      metadata: {
        queryId: 'retail_analytical_13',
        sourceRow: 48,
        tier: 'ambiguous',
        criteria: [
          'States that there are no orders on December 19, 2017 for this customer.',
          "Uses the closest order (#1085003, December 20, 2017) instead of stopping at 'no orders found'.",
          'Concludes that no product appears more than once.',
        ],
      },
    },
    // heatlhcare_analytical_4 | simple
    {
      input: {
        question:
          "Is it true that the measure 'Communication with Nurses' is a 'Composite measure'?",
      },
      output: {
        expected:
          'Yes, that\'s correct. The measure "Communication with Nurses" (Measure ID: H_COMP_1) is classified as a Composite Measure in the HCAHPS measures data.',
        esqlQueries: ['FROM measures\n| WHERE Measure == "Communication with Nurses"'],
      },
      metadata: {
        queryId: 'heatlhcare_analytical_4',
        sourceRow: 115,
        tier: 'simple',
      },
    },
    // heatlhcare_analytical_14 | medium
    // note: Source ES|QL fails: Response Rate (%) is mapped as integer, so != "Not Available" is a type error. Treating nulls as 0 gives ~27.7% (wrong).
    {
      input: {
        question:
          'What is the average Response Rate (%) for all hospitals in Ohio during the Jul_2017 release period?',
      },
      output: {
        expected:
          'The average Response Rate (%) for hospitals in Ohio (OH) in the Jul_2017 (07_2017) release is 30.15%, based on the 154 facilities that reported a response rate (14 of the 168 Ohio facilities had no response rate available).',
        esqlQueries: [
          'FROM responses\n| WHERE State == "OH" AND `Release Period` == "07_2017"\n| STATS avg_response_rate = AVG(`Response Rate (%)`), facilities = COUNT(*), facilities_with_rate = COUNT(`Response Rate (%)`)',
        ],
      },
      metadata: {
        queryId: 'heatlhcare_analytical_14',
        sourceRow: 125,
        tier: 'medium',
      },
    },
    // heatlhcare_analytical_15 | medium
    // note: Tie at the top (NE, SD). DC is included as a state; excluding it makes the minimum 65% (MD, NJ, NY).
    {
      input: {
        question:
          'For the Jul_2022 report, what is the range of top-box scores for the Overall Hospital Rating measure across all states?',
      },
      output: {
        expected:
          'For the July 2022 (07_2022) report, Overall Hospital Rating (H_HSP_RATING) top-box scores across all 51 states (including DC) range from 63% to 80%, a spread of 17 percentage points.\n\n- Lowest: District of Columbia (DC) at 63%\n- Highest: Nebraska (NE) and South Dakota (SD), both at 80%',
        esqlQueries: [
          'FROM measures\n| WHERE Measure == "Overall Hospital Rating"',
          'FROM state_results\n| WHERE `Release Period` == "07_2022" AND `Measure ID` == "H_HSP_RATING"\n| KEEP State, `Top-box Percentage`\n| SORT State',
        ],
      },
      metadata: {
        queryId: 'heatlhcare_analytical_15',
        sourceRow: 126,
        tier: 'medium',
      },
    },
    // heatlhcare_analytical_13 | hard
    // note: 'National average' = national_results top-box (72) or mean of 51 state scores (71.96); both give the same 5 states.
    {
      input: {
        question:
          'For the Jul_2021 release, which states in the Mountain region scored below the national average on the measure Willingness to Recommend the Hospital?',
      },
      output: {
        expected:
          'For the July 2021 (07_2021) release, the national top-box score for Willingness to Recommend the Hospital (H_RECMND) was 72%. Of the 8 Mountain region states, 5 scored below it:\n\n| State           | Top-box % |\n|-----------------|-----------|\n| New Mexico (NM) | 65%       |\n| Arizona (AZ)    | 69%       |\n| Montana (MT)    | 70%       |\n| Wyoming (WY)    | 70%       |\n| Nevada (NV)     | 71%       |\n\nThe other 3 Mountain states scored above the national average: Idaho (ID) 75%, Colorado (CO) 76%, Utah (UT) 76%.',
        esqlQueries: [
          'FROM states\n| WHERE Region == "Mountain"',
          'FROM measures\n| WHERE Measure == "Willingness to Recommend the Hospital"',
          'FROM state_results\n| WHERE `Release Period` == "07_2021" \n  AND State IN ("MT", "ID", "WY", "CO", "NM", "AZ", "UT", "NV")\n  AND `Measure ID` == "H_RECMND"\n| KEEP State, `Measure ID`, `Top-box Percentage`, `Middle-box Percentage`, `Bottom-box Percentage`, `Release Period`\n| SORT State',
          'FROM national_results\n| WHERE `Release Period` == "07_2021" AND `Measure ID` == "H_RECMND"',
        ],
      },
      metadata: {
        queryId: 'heatlhcare_analytical_13',
        sourceRow: 124,
        tier: 'hard',
      },
    },
    // heatlhcare_analytical_12 | hard
    // note: Most recent release must be resolved from reports (07_2023). Region average is an unweighted mean of state top-box scores.
    {
      input: {
        question:
          'For the most recent HCAHPS release, report: (a) the national top-box for Communication with nurses and (b) the region with the highest average state-level top-box for the same measure.',
      },
      output: {
        expected:
          'For the most recent HCAHPS release (July 2023, covering October 2021 - September 2022):\n\n(a) National Top-Box for Communication with Nurses (H_COMP_1): 79%\n\n(b) Region with Highest Average State-Level Top-Box: West North Central with an average of approximately 82.3%\n\n| Region             | Average Top-Box % |\n|--------------------|-------------------|\n| West North Central | 82.29%            |\n| West South Central | 81.00%            |\n| East South Central | 80.00%            |\n| East North Central | 79.80%            |\n| New England        | 79.50%            |\n| Mountain           | 78.75%            |\n| Pacific            | 78.00%            |\n| South Atlantic     | 76.22%            |\n| Mid-Atlantic       | 75.67%            |',
        esqlQueries: [
          'FROM reports\n| SORT `End Date` DESC\n| KEEP `Release Period`, `End Date`, `Start Date`\n| LIMIT 1',
          'FROM measures\n| WHERE Measure == "Communication with Nurses"',
          'FROM national_results\n| WHERE `Measure ID` == "H_COMP_1" AND `Release Period` == "07_2023"\n| KEEP `Top-box Percentage`',
          'FROM states\n| KEEP State, `State Name`, Region',
          'FROM state_results\n| WHERE `Measure ID` == "H_COMP_1" AND `Release Period` == "07_2023"\n| KEEP State, `Top-box Percentage`',
        ],
      },
      metadata: {
        queryId: 'heatlhcare_analytical_12',
        sourceRow: 123,
        tier: 'hard',
      },
    },
    // heatlhcare_analytical_22 | ambiguous
    // note: Both mappings accepted: nearest release by name (07_2020 -> 07_2021, 6 regions) or release whose data period covers the month (07_2021 -> 07_2022, 2 regions; Mid-Atlantic at exactly -1.00 does not beat national). Source ES|QL region CASE matches the states index.
    {
      input: {
        question:
          'From Jan_2020 to Jan_2021, which regions improved their average top-box for \u201cOverall hospital rating\u201d by more than the national increase?',
      },
      output: {
        expected:
          'HCAHPS releases are published only in July, so there are no January 2020 or January 2021 releases. Using the closest releases, 07_2020 and 07_2021: the national top-box for Overall Hospital Rating (H_HSP_RATING) stayed flat at 73% (national increase of 0). Regions whose average state top-box improved by more than that:\n\n| Region             | 07_2020 | 07_2021 | Change |\n|--------------------|---------|---------|--------|\n| Mid-Atlantic       | 67.67%  | 68.33%  | +0.67  |\n| West North Central | 77.29%  | 77.57%  | +0.29  |\n| East South Central | 72.25%  | 72.50%  | +0.25  |\n| West South Central | 74.75%  | 75.00%  | +0.25  |\n| Mountain           | 72.13%  | 72.38%  | +0.25  |\n| New England        | 73.00%  | 73.17%  | +0.17  |\n\nSouth Atlantic and East North Central were flat (+0.00), and Pacific declined (-0.40).\n\nAlternatively, using the releases whose data periods include January 2020 and January 2021 (07_2021, covering Oct 2019 - Sep 2020, and 07_2022, covering Oct 2020 - Sep 2021), the national score fell from 73% to 72% (-1), and only West North Central (+0.29) and Mountain (-0.50) did better than the national change.',
        esqlQueries: [
          'FROM measures\n| WHERE Measure == "Overall Hospital Rating"',
          'FROM national_results\n| WHERE `Measure ID` == "H_HSP_RATING" AND `Release Period` IN ("07_2020", "07_2021")\n| KEEP `Measure ID`, `Release Period`, `Top-box Percentage`',
          'FROM states\n| KEEP State, Region',
          'FROM state_results\n| WHERE `Measure ID` == "H_HSP_RATING" AND `Release Period` IN ("07_2020", "07_2021")\n| EVAL Region = CASE(\n    State IN ("AK", "CA", "HI", "OR", "WA"), "Pacific",\n    State IN ("AL", "KY", "MS", "TN"), "East South Central",\n    State IN ("AR", "LA", "OK", "TX"), "West South Central",\n    State IN ("AZ", "CO", "ID", "MT", "NM", "NV", "UT", "WY"), "Mountain",\n    State IN ("CT", "MA", "ME", "NH", "RI", "VT"), "New England",\n    State IN ("DC", "DE", "FL", "GA", "MD", "NC", "SC", "VA", "WV"), "South Atlantic",\n    State IN ("IA", "KS", "MN", "MO", "ND", "NE", "SD"), "West North Central",\n    State IN ("NJ", "NY", "PA"), "Mid-Atlantic",\n    State IN ("IL", "IN", "MI", "OH", "WI"), "East North Central",\n    "Other"\n  )\n| STATS avg_2020 = AVG(`Top-box Percentage`) WHERE `Release Period` == "07_2020", avg_2021 = AVG(`Top-box Percentage`) WHERE `Release Period` == "07_2021" BY Region\n| EVAL improvement = avg_2021 - avg_2020\n| WHERE improvement > 0',
        ],
      },
      metadata: {
        queryId: 'heatlhcare_analytical_22',
        sourceRow: 133,
        tier: 'ambiguous',
        criteria: [
          'States that no January releases exist and says which release periods were used instead.',
          'Gives a concrete list of regions for the chosen mapping rather than refusing or asking for clarification.',
        ],
      },
    },
  ],
};
