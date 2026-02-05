/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, phoenixClient, traceEsClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          phoenixClient,
          traceEsClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});
evaluate.describe(
  'Default Agent Knowledge Base Retrieval - AgentBuilder',
  { tag: '@svlSearch' },
  () => {
    evaluate('text retrieval queries', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: default-agent-text-retrieval-queries',
          description: 'Dataset containing Text Retrieval queries',
          examples: [
            {
              input: {
                question:
                  'Can I start accepting payments on my site while my Wix Payments account is still under verification?',
              },
              output: {
                expected:
                  'You can start accepting payments on your site using [Wix Payments](https://support.wix.com/en/article/about-wix-payments) almost immediately. However, we need to verify your identity before your account can be fully activated.',
                groundTruth: {
                  wix_knowledge_base: {
                    '49d9e88fadbf11fa4e685c847590078ff9394c2fe7566094f504f53ca4aca465': 1,
                  },
                },
              },
              metadata: {
                query_intent: 'Factual',
              },
            },
            {
              input: {
                question:
                  'I am inquiring about purchasing the yearly premium plan for $17.00, which includes a free domain for 1 year. However, the voucher does not show up at checkout. Do I need to purchase the plan first and then will the voucher be available to activate?',
              },
              output: {
                expected:
                  'When you purchase a yearly Premium plan, the free domain voucher is not immediately visible at checkout. Instead, the voucher becomes available after you complete the purchase of the plan. You can then claim the voucher by visiting the [Premium Vouchers page](https://manage.wix.com/account/vouchers?referralAdditionalInfo=%7Btheir) in your Wix account. The voucher is valid for two months from the date of purchase, and you can use it to register a domain for free for one year. If you have already purchased the plan and still do not see the voucher, ensure that you meet all eligibility criteria, such as not having purchased a monthly plan or a domain prior to the plan. If issues persist, you can [contact Wix Customer Care](https://support.wix.com/en/article/contacting-wix-customer-care-for-support) for further assistance.',
                groundTruth: {
                  wix_knowledge_base: {
                    '06535db983ea0ffe0214af14497a1d158f279d92c92f211e87b8820aa95dbe43': 1,
                  },
                },
              },
              metadata: {
                query_intent: 'Procedural',
              },
            },
            {
              input: {
                question: "I'm want to know how much it would cost to upgrade my email plan.",
              },
              output: {
                expected:
                  "To upgrade your email marketing plan:\n[Go to Email Marketing](https://www.wix.com/my-account/site-selector/?buttonText=Email%20Marketing%20Dashboard&title=Select%20a%20Site&autoSelectOnSingleSite=true&actionUrl=https://www.wix.com/dashboard/%7B%7BmetaSiteId%7D%7D/shoutout/) in your site's dashboard.  Under Monthly Balance click Upgrade.\n  Choose a plan that works best for you and checkout.",
                groundTruth: {
                  wix_knowledge_base: {
                    de6e96935f0b3321cf29416ec164482247b5035f1d2e12b36e203be8126ca8b8: 1,
                  },
                },
              },
              metadata: {
                query_intent: 'Procedural',
              },
            },
            {
              input: {
                question:
                  'I want to know if the Wix store function work for selling services instead of just physical goods',
              },
              output: {
                expected:
                  'Wix Stores gives you all the tools you need to create a sleek, professional online store and grow your eCommerce business.\n  \nWix Bookings, however, is an easy-to-use scheduling system that lets your members book and [pay for] (https://support.wix.com/en/article/wix-bookings-about-getting-paid-online) services online, so you can focus on managing your business. Whether you offer services like workshops, courses, or private sessions, online or in-person, Wix Bookings has you covered.',
                groundTruth: {
                  wix_knowledge_base: {
                    a513a215c1798f329293330cb5f5e975a18978954b5ee27d84441e029f900d51: 1,
                    b9ba8c318ee75f49eaa89c1d5b8d461fa2b4c27167381b869aeb31027d7187f9: 1,
                  },
                },
              },
              metadata: {
                query_intent: 'Factual',
              },
            },
            {
              input: {
                question:
                  'How can I add discounts to my service prices when customers pay for a plan?',
              },
              output: {
                expected:
                  "To add discounts to your service prices when customers pay for a plan, you can create discount coupons for your pricing plans. You can choose to offer a price discount or a percentage discount coupon. You can also choose whether your discount coupons apply to a specific plan or to all your pricing plans. Your clients redeem the coupon at checkout to take advantage of the discounted plans. Note: Discount coupons for Pricing Plans cover the plans themselves, but not any setup fees you may have enabled. To create discount coupons for your pricing plans:\n\n1. Go to Pricing Plans in your site's dashboard.\n2. Click the More Actions icon at the top.\n3. Click Create a coupon.\n4. Select the type of coupon you want to offer:\n   - $ Discount: Offer a fixed monetary discount amount.\n   - % Discount: Offer a percentage discount.\n5. Enter the Coupon code clients use to redeem the coupon.\n6. Enter the Coupon name for your own records.\n7. Click the Apply to drop-down and choose the relevant pricing plan(s):\n   - All plans: This is applied to all your available pricing plans.\n   - Specific plan: Click the Pricing plan drop-down and select the relevant plan.\n8. Choose how the coupon works with your pricing plans:\n   - First billing cycle: The coupon offers a one-time discount at the start of the pricing plan.\n   - All billing cycles: The coupon offers a recurring discount, every time your client is charged.\n   - Custom: You choose how your coupons work with recurring payments (e.g. give a discount for the first 4 billing cycles).\n9. Select the dates the coupon is valid between.\n10. (Optional) Select the Limit the total number of uses for this coupon checkbox and enter the number of times the coupon can be used.\n11. (Optional) Select the Limit to one use per customer checkbox if you want clients to be able to use the coupon only one time.\n12. Click Create Coupon.",
                groundTruth: {
                  wix_knowledge_base: {
                    '8cc75fbcc571336d1ef1768e7727bd9d1e6c1333f22eeb5366232b9a1a066418': 1,
                  },
                },
              },
              metadata: {
                query_intent: 'Procedural',
              },
            },
            {
              input: {
                question:
                  'I am trying to change the order of the items within a CMS collection on my Wix site, but the provided steps did not work for me.',
              },
              output: {
                expected:
                  "To change the order of items within a CMS collection on your Wix site, you should follow these steps:\n\n1. Go to the CMS in your site's dashboard or editor.\n2. Click on the relevant collection.\n3. If you have multiple collection views, select the view you want to sort items in.\n4. Click 'Sort' at the top of your collection.\n5. Click '+ Add a Sort'.\n6. Choose the field you want to sort by from the 'Sort by' drop-down menu.\n7. Select the sorting order (e.g., A-Z, Low-High, Oldest-Newest).\n8. Click 'Add Sort'.\n9. To apply this order to your live site, enable the 'Mirror on Site' toggle at the top of the collection.\n\nIf these steps did not work, ensure that the 'Mirror on Site' feature is enabled, as this is necessary for the order in your collection view to be reflected on your live site. Additionally, check if there are any sort conditions added to datasets, as these can override the order set in your mirrored collection view. For more detailed guidance, you can refer to the [Wix support article on mirroring item order](https://support.wix.com/en/article/cms-mirroring-the-order-of-items-in-your-collection-to-your-sites-connected-elements).",
                groundTruth: {
                  wix_knowledge_base: {
                    f346781bc6cf23c95342ce003927de9d985a99eeb7561c69f03e65da7c10f2fb: 1,
                    '163d579af227160c8072dc465c81d8edea4b507d7e8789078b680f88633aefab': 1,
                    '2df694686b70b35ed389ff590354cfaf19aafc07659b12b02078f2ebcf015ac8': 1,
                  },
                },
              },
              metadata: {
                query_intent: 'Issue Resolution',
              },
            },
            {
              input: {
                question:
                  'How do I sync the hotel app with my calendars ical link to allow visitors to book available dates on my site?',
              },
              output: {
                expected:
                  'To sync your hotel app with your calendars using an iCal link, you can import reservations from external services like Airbnb, HomeAway, and VRBO to your Wix Hotels reservation calendar. This is a one-way sync from iCal to the Wix Calendar.\nTo import your external calendar - \n  1. [Locate your iCal URL.] (https://support.wix.com/en/article/finding-your-ical-url)\n  2. [Go to your dashboard.] (https://support.wix.com/en/article/accessing-your-sites-dashboard)\n  3. Click the Hotels tab.\n  4. Click to expand the Reservations tab.\n  5. Select iCal.\n  6. Click the Choose Type drop-down menu and select a room type.\n  7. Paste your iCal URL into the URL field. \n  8. (Optional) Click Add Calendar to add another room type and paste the iCal URL in the URL field.\n  9. Click Save.\nPlease note that - \n  * You can only import from services that allow you to export your calendar in iCal format.\n  * The sync is one way only, from iCal to the Wix Calendar.\n  * If you have multiple room types, you must add a different iCal URL for each room type.\n  * Imported rates do not appear in the calendar. Rates can be viewed by clicking on the reservation in the calendar and scrolling down to the Payment Details section.\n  * This feature is not compatible with the Wix Hotels Channel Manager. If you want to connect the Channel Manager please delete all the URLs in this tab before doing so.',
                groundTruth: {
                  wix_knowledge_base: {
                    '5f02fc2f8937d16a4d8cdca47da36ae34429e0b279fb0cc56af72e2d91991a28': 1,
                  },
                },
              },
              metadata: {
                query_intent: 'Procedural',
              },
            },
            {
              input: {
                question:
                  'I am trying to verify my domain with Google Workspace. I need to add a TXT record to my domains DNS settings. I have confirmed that my domain is connected to Wix via pointing. What to do now?',
              },
              output: {
                expected:
                  "To verify your domain with Google Workspace by adding a TXT record, you need to manage your DNS settings with your domain host, not Wix, since your domain is connected via pointing. Follow these steps:\n\n1. Log in to your domain host account where your DNS records are managed.\n2. Add the TXT record provided by Google Workspace to your domain's DNS settings.\n3. After adding the TXT record, return to the Google Admin Console and click 'Verify'.",
                groundTruth: {
                  wix_knowledge_base: {
                    '65806b123ff355cef16c8abe4301f1df982e2c3bddcd33b81ed446b92a79e336': 1,
                    db6a6c4be5c11fae531b4fdd546601bab6d4a26b669a8a7ea6063c62a045e9d4: 1,
                  },
                },
              },
              metadata: {
                query_intent: 'Procedural',
              },
            },
            {
              input: {
                question:
                  'I cant access my old email address to change my password. I have a recovery phone number added to my Wix account.',
              },
              output: {
                expected:
                  "If you've previously added a Recovery Phone Number to your Wix account, you can get a one-time SMS code sent to your mobile phone to recover your Wix account.\n  To recover your account:\n  1. Go to the Wix Log In page. (https://users.wix.com/signin)\n  2. Click Forgot Email?.\n  3. Select Can't access my login email.\n  4. Click Next.\n  5. Enter the email address associated with your Wix account. \n  6. Click Next.\n  7. Select Send me a code to my phone number ending with XXXX and click Next.\n  8. Enter the one-time verification code sent to your phone under Enter code here.\n  9. Click Verify.\n  10. Enter a new password and retype it.\n  11. Click Save New Password. \n  \n  After you recover your account, you should change the email address of your account (https://support.wix.com/en/article/changing-the-email-address-of-your-wix-account) to one that you are able to access.\n  To change your email address:\n  1. Go to Account Settings in your Wix account.\n  2. Click the Account email field.\n  3. Enter your Wix account password in the pop-up.\n  4. Enter your new account email address.\n  5. Retype your new email account email address to confirm it.\n  6. Click Next.\n  7. Check your email account for an email from Wix.\n  8. Copy the 6-digit confirmation code.\n  9. Go back to Account Settings in your Wix account.\n  10. Paste the code into the pop-up.\n  11. Click Submit.",
                groundTruth: {
                  wix_knowledge_base: {
                    '39158650c97235d1f9b98a71be41c5222ddb3ee3e497cfb1d10ef3bd0bc166cf': 1,
                    e9366441d1e037a1470c9bad57455dbadc24db0ca931791edd0f3b026ea6a58f: 1,
                  },
                },
              },
              metadata: {
                query_intent: 'Procedural',
              },
            },
          ],
        },
      });
    });

    evaluate('analytical queries', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: default-agent-analytical-queries',
          description: 'Dataset containing Analytical queries',
          examples: [
            {
              input: { question: 'When did tina.jackson@gray-smith.com signup' },
              output: { expected: `Oct 23, 2024 at 05:42:03` },
              metadata: {
                query_intent: 'Factual',
                esql: `FROM users
| WHERE email == "tina.jackson@gray-smith.com"
| KEEP created_at`,
              },
            },
            {
              input: { question: 'What is the id of the project that was deleted most recently' },
              output: {
                expected: `id: 6138da66-1f68-4ff7-bb96-33af19a3a13e; deleted_at: Oct 23, 2024 @ 15:51:21.000`,
              },
              metadata: {
                query_intent: 'Factual - Temporal',
                esql: `FROM projects
| WHERE deleted_at IS NOT NULL
| SORT deleted_at DESC
| LIMIT 1
| KEEP id, deleted_at`,
              },
            },
            {
              input: {
                question:
                  'What is the id of the project with highest daily average error count between Jun 2024 to Dec 2024',
              },
              output: { expected: `5ed20eb2-4b16-422e-95ea-e2357378a2fa` },
              metadata: {
                query_intent: 'Factual - Temporal',
                esql: `FROM error_rate_daily
| WHERE date >= "2024-06-01" AND date <= "2024-12-31"
| STATS avg_daily_errors = AVG(error_count) BY project_id
| SORT avg_daily_errors DESC
| LIMIT 1
| KEEP project_id`,
              },
            },
            {
              input: {
                question:
                  'Which project has the maximum avergae error rate? At what date that project had the maximum error rate?',
              },
              output: {
                expected: `The project that has the maximum avergae error rate is: 9d3031c7-4c66-4375-bd95-a4582c4345f3
The project had the maximum error rate of 0.278 on Oct 22, 2024`,
              },
              metadata: {
                query_intent: 'Factual - Comparative',
                esql: `FROM error_rate_daily
| STATS avg_rate = AVG(error_rate) BY project_id
| SORT avg_rate DESC
| LIMIT 1
| KEEP project_id
\`\`\`

\`\`\`
FROM error_rate_daily
| WHERE project_id == "9d3031c7-4c66-4375-bd95-a4582c4345f3"
| SORT error_rate DESC
| LIMIT 1
| KEEP date, error_rate`,
              },
            },
            {
              input: {
                question:
                  'What is the zendesk user id and last name of the user with highest project limit?',
              },
              output: {
                expected: `The zendesk_user_id is 41
Last name is Diaz
max_project_limit is 932`,
              },
              metadata: {
                query_intent: 'Factual',
                esql: `FROM users
| WHERE max_project_limit IS NOT NULL
| SORT max_project_limit DESC
| LIMIT 1
| KEEP zendesk_user_id, last_name, max_project_limit`,
              },
            },
            {
              input: { question: 'How many invoices were in paid vs pending status in 2024?' },
              output: { expected: `733 were paid and 94 were pending` },
              metadata: {
                query_intent: 'Factual - Classification',
                esql: `FROM invoice
| WHERE year == 2024 AND status IN ("paid", "pending")
| STATS invoice_count = COUNT(stripe_invoice_id) BY status`,
              },
            },
            {
              input: {
                question:
                  'Today is Jul 8 2025. How many support tickets were created in the last 365 days and how many of those are still open',
              },
              output: {
                expected: `Total tickets created in last 365 days are 220 and out of those 76 are in open or pending status`,
              },
              metadata: {
                query_intent: 'Factual - Classification',
                esql: `FROM support_ticket
| WHERE created_at >= "2025-07-08" - 365 day
| STATS total_tickets = COUNT(id), open_tickets = COUNT(CASE(status IN ("open", "pending"), 1, NULL))`,
              },
            },
            {
              input: {
                question:
                  'Today is Jul 8 2025. What is the daily average of project creations in last 365 days?',
              },
              output: { expected: `2.021 projects/day` },
              metadata: {
                query_intent: 'Factual - Temporal',
                esql: `FROM projects
| WHERE created_at >= "2025-07-08" - 365 day
| STATS daily_count = COUNT(id) BY DATE_FORMAT("day", created_at)
| STATS avg_daily_creations = AVG(daily_count)`,
              },
            },
            {
              input: {
                question:
                  'What are the number of active models and active commands of the project that had the longest lifetime?',
              },
              output: {
                expected: `id: 6138da66-1f68-4ff7-bb96-33af19a3a13e
active_models: 46
active_commands: 65`,
              },
              metadata: {
                query_intent: 'Factual',
                esql: `FROM projects
| WHERE deleted_at IS NOT NULL
| EVAL lifetime_in_seconds = DATE_DIFF("seconds", deleted_at, created_at)
| SORT lifetime_in_seconds DESC
| LIMIT 1
| KEEP id, active_models, active_commands`,
              },
            },
            {
              input: { question: 'Get top 5 customer ids with most requests' },
              output: {
                expected: `The top 5 customer id's with most requests are: 
cus_4a70ca84b46043ef, cus_40b3b3895a2d4eff, cus_a91d94735e5c4b72, cus_18e5efc0d5064430, cus_c373f2afc2c544ea`,
              },
              metadata: {
                query_intent: 'Factual',
                esql: `FROM requests_daily_count
| STATS total_requests = SUM(request_count) BY project_id
| SORT total_requests DESC
| LIMIT 5
| KEEP project_id
\`\`\`
\`\`\`
FROM projects
| WHERE id IN ("4e0f6be8-ed9f-468d-b087-22971343b4b9", "4cb97dba-f6f7-4db6-bf54-04ef5311e717", "3f5efc8b-ab63-42f8-adbc-970946e77d03", "afdd5609-733e-4c94-9eae-6861d8ec9ecf", "52ddcd47-053a-40ae-953f-c85db389d5eb")
| KEEP owner_id
\`\`\`
\`\`\`
FROM users
| WHERE id IN ("fd650d8f-b787-4d9c-a787-f25205bee7d3", "88ec5c03-3cd4-4b36-a5bc-2c0419cd0e72", "3d24de5a-7a44-45c9-9ed9-9c7b61176e3d", "17eacb47-cab4-4cb5-8d08-9a991067ccda", "83009c11-94c9-4d65-b15f-2be150ab558c")
| KEEP customer_id`,
              },
            },
            {
              input: { question: 'How many projects did tina.jackson@gray-smith.com create' },
              output: {
                expected: `user id: eda2b9d8-caec-4913-85ac-953fff43a439
tina.jackson@gray-smith.com created 6 projects`,
              },
              metadata: {
                query_intent: 'Factual',
                esql: `FROM users
| WHERE email == "tina.jackson@gray-smith.com"
| KEEP id
\`\`\`
\`\`\`
FROM projects
| WHERE owner_id == "eda2b9d8-caec-4913-85ac-953fff43a439"
| STATS project_count = COUNT(id)`,
              },
            },
            {
              input: {
                question:
                  'How many open or pending tickets does each support agent currently have assigned to them?',
              },
              output: {
                expected: `Agent, ticket_count
1454,7
1754,11
605613
7774,18
7840,12
7913,8
7955,12
8315,10
8907,11
9554,11
no agent id, 7`,
              },
              metadata: {
                query_intent: 'Factual - Classification',
                esql: `FROM support_ticket
| WHERE status IN ("open", "pending")
| STATS ticket_count = COUNT(id) BY assignee_id
| SORT assignee_id`,
              },
            },
            {
              input: {
                question:
                  'Today is Oct 31 2024. How many new projects were created this month compared to last month?',
              },
              output: {
                expected: `Month, projects_created
10,40
9,22`,
              },
              metadata: {
                query_intent: 'Factual - Comparative',
                esql: `FROM projects
| WHERE created_at >= "2024-10-31" - 2 month
| STATS monthly_project_creations = COUNT(id) BY DATE_EXTRACT("month_of_year", created_at)`,
              },
            },
            {
              input: {
                question:
                  'Today is Jul 8 2025. Which 10 projects generated the most revenue last 10 months?',
              },
              output: {
                expected: `project_id, total_revenue
2aa0cdeb-9865-4281-a783-fbfa8c6731f1, 5790
5389ca1d-543d-4d99-918e-b94fd7ea8f32, 5580
1e4ed485-c24c-411a-a32f-f8122befb9fe, 5250
be9884e1-8fad-4d40-be52-2abd8ccd746c, 5130
a34450d4-2101-4f9a-b22d-b46e6e27934c, 5070
9c562378-3f3b-456d-b396-1a7f7eaa23c7, 5040
f81c5db1-c3eb-4c03-956c-807b8de11c73, 4980        
58e1cce5-ef49-4dd5-8182-25f46020e687, 4920
126a64b3-cc8a-4a42-af3f-46e911e24bdf, 4920
c06a4866-f097-4eed-b7ca-28d60c9ba864, 4890`,
              },
              metadata: {
                query_intent: 'Factual - Temporal',
                esql: `FROM invoice_item
| WHERE created_at >= "2025-07-08" - 10 month
| STATS total_revenue = SUM(amount) BY project_id
| SORT total_revenue DESC
| LIMIT 10`,
              },
            },
            {
              input: {
                question:
                  'Toady is Jan 1 2025. Between support agents with ids 1454 and 6056, which one has a higher ticket closure rate for high or urgent priority issues in last 180 days?',
              },
              output: {
                expected: `assignee_id, total_tickets, closed_tickets, closure_rate
6056,12,7,58.33
1454,3,1,33.33`,
              },
              metadata: {
                query_intent: 'Factual - Comparative',
                esql: `FROM support_ticket
| WHERE created_at >= "2025-01-01" - 180 day and assignee_id IN (1454, 6056) AND priority IN ("high", "urgent")
| STATS total_tickets = COUNT(id), closed_tickets = COUNT(CASE(status == "closed", 1, NULL)) BY assignee_id
| EVAL closure_rate = closed_tickets * 100.0 / total_tickets
| SORT closure_rate DESC`,
              },
            },
          ],
        },
      });
    });

    evaluate('hybrid queries', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: default-agent-hybrid-queries',
          description: 'Dataset containing Hybrid queries',
          examples: [
            {
              input: {
                question:
                  'Get the ids for all the users who have ceated a supported ticket complaining about connection timeout',
              },
              output: {
                expected: `These are requester ids for all such users: 5, 10, 21, 47, 52, 54, 21, 61, 67, 80, 87, 33, 57, 62, 71, 89`,
              },
              metadata: {
                query_intent: 'Factual - Classification',
                esql: `FROM support_ticket
| WHERE MATCH(subject, "connection timeout")
| KEEP requester_id`,
              },
            },
            {
              input: {
                question: 'What is the status of the urgent ticket about GCP Compute Engine?',
              },
              output: {
                expected: `There is only one urgent ticket about GCP Compute Engine; id: 328 and it's open currently`,
              },
              metadata: {
                query_intent: 'Factual',
                esql: `FROM support_ticket
| WHERE priority == "urgent" AND MATCH(subject, "GCP Compute Engine")
| KEEP id, status, subject`,
              },
            },
            {
              input: {
                question: 'Which agent are handling tickets that include remote schema issues?',
              },
              output: {
                expected: `Following agents are working on the tickets mentioning remote schema
6056, 7774, 7840, 1454, 7913, 8907, 8315, 1754, 9554, 7955`,
              },
              metadata: {
                query_intent: 'Factual',
                esql: `FROM support_ticket
| WHERE MATCH(description, "remote schema")
| STATS ticket_count = COUNT(id) BY assignee_id
| SORT ticket_count DESC`,
              },
            },
            {
              input: {
                question:
                  'What are the average open durations of unresolved normal or high priority tickets that mention memory?',
              },
              output: { expected: `368.714 days` },
              metadata: {
                query_intent: 'Factual',
                esql: `FROM support_ticket
| WHERE priority IN ("normal", "high") AND status NOT IN ("solved", "closed") AND MATCH(description, "memory")
| EVAL open_duration_hours = DATE_DIFF("days", created_at, NOW())
| STATS avg_open_duration_in_hours = AVG(open_duration_hours)`,
              },
            },
            {
              input: {
                question: 'Do tickets realted timeouts tend to be marked as higher priority?',
              },
              output: {
                expected: `priority, count_by_priority
normal,50
urgent,14
high,12
low,8`,
              },
              metadata: {
                query_intent: 'Investigative',
                esql: `FROM support_ticket
| WHERE MATCH(description, "timeout")
| STATS count_by_priority = COUNT(id) BY priority
| SORT count_by_priority DESC`,
              },
            },
            {
              input: {
                question:
                  'What is the average response time for tickets where the user reported remote schema stitching failed',
              },
              output: { expected: `1.096 days` },
              metadata: {
                query_intent: 'Factual',
                esql: `FROM support_ticket
| WHERE MATCH(description, "remote schema stitching failed")
| STATS avg_first_response_time = AVG(DATE_DIFF("days",created_at, first_response_time))
| SORT avg_first_response_time DESC`,
              },
            },
            {
              input: {
                question:
                  'For tickets created in H2 2024; is it true that all tickets where customers mentioned hitting rate limits were resolved within the 12 hours resolution target? Were there multiple support agents involved? If yes, then which support agent resolved it the slowest?',
              },
              output: {
                expected: `No, the average was about 34 hrs.
The agent with the slowest response time of about 44 hours has assignee id: 8315. Although there are cases where the agent id is missing and the average response time was higher than that of agent with assignee_id: 8315`,
              },
              metadata: {
                query_intent: 'Investigative',
                esql: `FROM support_ticket
| WHERE MATCH(description, "hitting rate limits") AND created_at >= DATE_PARSE("yyyy-MM-dd", "2024-06-01") AND created_at < DATE_PARSE("yyyy-MM-dd", "2025-01-01")
| EVAL response_time = (DATE_DIFF("hours",created_at, first_response_time))
| KEEP assignee_id, response_time, id
| SORT response_time DESC `,
              },
            },
            {
              input: {
                question:
                  "I'm investigating the SSL/TLS handshake failed errors. Can you check the descriptions of these tickets and count how many are occurring on GCP, AWS, or other specific platforms to see if there's a pattern?",
              },
              output: {
                expected: `Out of total 5 cases 4 tickets mention using Hasura cloud services and 1 mentions GCP`,
              },
              metadata: { query_intent: 'Investigative' },
            },
            {
              input: {
                question:
                  'First, find our top 3 requesters by total number of tickets submitted. Then, for only those requesters, what are the most common subjects of their tickets? I need to know what their biggest pain points are',
              },
              output: {
                expected: `1. Requester ID: 9
2. Requester ID: 2
3. Requester ID: 17
### Requester ID: 2
- **Infrastructure Issues**
- **Integration** and **Performance Concerns**
### Requester ID: 9
- **Scheduled Tasks**
- **Performance Issues**
### Requester ID: 17
- **SSL/TLS Configuration**
- **Remote Join Issues**`,
              },
              metadata: { query_intent: 'Investigative' },
            },
          ],
        },
      });
    });

    evaluate('unanswerable queries', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: default-agent-unanswerable-queries',
          description: 'Dataset containing Unanswerable queries',
          examples: [
            {
              input: {
                question:
                  'Are there any customers on a base or advanced plan who have created support tickets in the last quater?',
              },
              output: {
                expected: `I can't answer this using the current tools as this requires aggregating information from multiple indices.`,
              },
              metadata: { query_intent: 'Investigative' },
            },
            {
              input: {
                question:
                  'Find customer ids of all customers with repeated permissions related issues over the last 180 days',
              },
              output: {
                expected: `I can't answer this using the current tools as this requires aggregating information from multiple indices.`,
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: { question: 'What is the customer_id of John Doe?' },
              output: { expected: `I couldn't find the customer_id of John Doe` },
              metadata: {
                query_intent: 'Factual',
                esql: `FROM users
| WHERE last_name == "Doe" AND first_name == "John"
| KEEP id`,
              },
            },
            {
              input: {
                question:
                  'How many tickets are currently assigned to support agent with id 1234? Which was the latest ticket assigned to them?',
              },
              output: {
                expected: `I couldn't find any information about support agent with id 1234`,
              },
              metadata: {
                query_intent: 'Factual',
                esql: `FROM support_ticket
| WHERE assignee_id == 1234
| STATS count = COUNT(*), latest_ticket = MAX(created_at)`,
              },
            },
            {
              input: { question: 'List all the organization with project limit less than 50' },
              output: { expected: `There seems to be no organization with a project limit < 50` },
              metadata: {
                query_intent: 'Factual',
                esql: `FROM users
| WHERE max_project_limit < 250
| KEEP organization_id`,
              },
            },
            {
              input: {
                question: 'What changes have been made to the Wix Shipping policy in July 2025?',
              },
              output: {
                expected: `I couldn't find any information about the Wix shipping policy update from July 2025`,
              },
              metadata: { query_intent: 'Investigative' },
            },
            {
              input: {
                question:
                  'Describe the process of setting up an Ad campaign with Alibaba Adverstising for my Wix Store',
              },
              output: {
                expected: `I couldn't find any specific information about setting up an Ad campaign with Alibaba Adverstising for a Wix Store`,
              },
              metadata: { query_intent: 'Procedural' },
            },
            {
              input: {
                question:
                  "I'm setting up my shop here in Canada using Wix. Which buy now, pay later companies can I use? Only answer using vetted articles",
              },
              output: {
                expected: `I couldn't find any information about which buy now, pay later companies are available to use for your store in canada; using the vetted articles.`,
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question:
                  'How can I see a breakdown of my TikTok traffic by specific videos or sounds? I want to know which of my viral TikToks drove the most sales',
              },
              output: { expected: `Sorry; there is no specific information about that` },
              metadata: { query_intent: 'Procedural' },
            },
            {
              input: {
                question:
                  'I want to create a UTM link for a paid TikTok campaign to track my sales in Wix. How do I do that and where do I find my TikTok Campaign ID?',
              },
              output: {
                expected: `To create a UTM link within Wix 
1. Go to the "Paid ad campaigns" section
2. Click "Create a UTM tracking link," fill out the site page URL, 
3. Then select "other" as the traffic source.
I don't have information on how to navigate the TikTok Ads Manager to locate a specific Campaign ID`,
              },
              metadata: { query_intent: 'Procedural' },
            },
            {
              input: {
                question:
                  "My report shows zero traffic from TikTok, but I know I'm getting clicks from my profile link. What's wrong how to fix it?",
              },
              output: {
                expected: `You can see traffic from TikTok under the Organic social traffic category. 
You can check the date range to ensure it's not too recent, as data from the current day is not yet included.
Also look for the Organic social section in the Marketing Overview.
Although I don't have any information related to troubleshooting steps specific to TikTok or how Wix identifies traffic as coming from TikTok.`,
              },
              metadata: { query_intent: 'Issue Resolution' },
            },
            {
              input: {
                question:
                  "I'm using a Spark Ad to promote a popular organic post on TikTok. I already connected my Facebook and Google accounts as instructed, but why won't my ad spend and cost-per-click for this TikTok Spark Ad show up in the Paid ad campaigns section?",
              },
              output: {
                expected: `I couldn't find specific information about a direct integration or account connection with TikTok for tracking financial ad data; and am unable to help you with this question. Is there something else you'd like to know?`,
              },
              metadata: { query_intent: 'Issue Resolution' },
            },
            {
              input: {
                question:
                  'I want to transfer my domain domain purchased from Wix to another host? Is there a seperate procedure for .co.uk domains?. Only answer using vetted articles',
              },
              output: {
                expected: `I couldn't find any information procedure specific to UK; but in general you can transfer a domain purchased from Wix to another domain host. When you transfer your domain away from Wix, your domain's contact information, DNS settings, and renewal payments are all managed in your new provider's account.
To transfer your domain:
1. Go to Domains in your Wix account.
2. Click the Domain Actions icon next to the relevant domain.
3. Select Transfer away from Wix.
4. After reviewing the info about transferring your domain, click Transfer Domain.
5. Click I Still Want to Transfer. We'll send a transfer authorization code (EPP code) to your domain's registrant contact email address.
6. Once you get the code, follow the instructions from your new domain host to transfer your domain.`,
              },
              metadata: { query_intent: 'Procedural' },
            },
          ],
        },
      });
    });

    evaluate('ambiguous queries', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: default-agent-ambiguous-queries',
          description: 'Dataset containing Ambiguous queries',
          examples: [
            {
              input: { question: 'List projects which are unhealthy?' },
              output: { expected: `Can you clarify how to determine if a project is unhealthy` },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: { question: 'Can I get a list of our most active users from last week?' },
              output: { expected: `What is the definition of an active user?` },
              metadata: { query_intent: 'Investigative' },
            },
            {
              input: { question: 'Who are our top-performing support agents?' },
              output: { expected: `How do you define perfromance for an agent` },
              metadata: { query_intent: 'Investigative' },
            },
            {
              input: { question: 'I would like to view my invoices.' },
              output: { expected: `Can you clarify which invoices would you like to see?` },
              metadata: { query_intent: 'Procedural' },
            },
          ],
        },
      });
    });
  }
);
