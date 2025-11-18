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
    ({ chatClient, evaluators, phoenixClient }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          phoenixClient,
        })
      );
    },
    { scope: 'test' },
  ],
});
evaluate.describe('Default Agent Knowledge Base Retrieval - AgentBuilder', { tag: '@svlSearch' }, () => {
  evaluate('text retrieval queries', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'agentBuilder: default-agent-text-retrieval-queries',
        description: 'Dataset containing Text Retrieval queries',
        examples: [
          {
            input: {
              question:
                'I am trying to verify my domain with Google Workspace. I need to add a TXT record to my domains DNS settings. I have confirmed that my domain is connected to Wix via pointing. What to do now?',
            },
            output: {
              expected: `To verify your domain with Google Workspace by adding a TXT record, you need to manage your DNS settings with your domain host, not Wix, since your domain is connected via pointing.
Follow these steps:
1. Log in to your domain host account where your DNS records are managed.
2. Add the TXT record provided by Google Workspace to your domain's DNS settings.
3. After adding the TXT record, return to the Google Admin Console and click 'Verify'.`,
            },
            metadata: { query_intent: 'Procedural' },
          },
          {
            input: {
              question:
                'I need to reset my password but the reset email is going to an old address I cant access anymore. I have my phone number linked to my account, how can I use it to regain access and update my email address to one I can access?',
            },
            output: {
              expected: `If you've previously added a Recovery Phone Number to your Wix account, you can get a one-time SMS code sent to your mobile phone to recover your Wix account.
To recover your account:
1. Go to the Wix Log In page.
2. Click Forgot Email?.
3. Select Can't access my login email.
4. Click Next.
5. Enter the email address associated with your Wix account.
6. Click Next.
7. Select Send me a code to my phone number ending with XXXX and click Next.
8. Enter the one-time verification code sent to your phone under Enter code here.
9. Click Verify.
10. Enter a new password and retype it.
11. Click Save New Password.
After you recover your account, you should change the email address of your account to one that you are able to access.
To change your email address:
1. Go to Account Settings in your Wix account.
2. Click the Account email field.
3. Enter your Wix account password in the pop-up.
4. Enter your new account email address.
5. Retype your new email account email address to confirm it.
6. Click Next.
7. Check your email account for an email from Wix.
8. Copy the 6-digit confirmation code.
9. Go back to Account Settings in your Wix account.
10. Paste the code into the pop-up.
11. Click Submit.`,
            },
            metadata: { query_intent: 'Procedural' },
          },
          {
            input: {
              question:
                'I need help managing the categories my booking services are in on my Wix website. How can I create, assign, reorder, rename, or delete categories?',
            },
            output: {
              expected: `To manage the categories for your booking services on your Wix website, you can follow these steps:
Creating categories
1. Go to Booking Services in your site's dashboard.
2. Click Manage Categories.
3. Click + Add New Category.
4. Enter the Category Name.
5. Click Add to save.
Assigning a service to a category
1. Go to Booking Services in your site's dashboard.
2. Select the service you want to assign to a category.
3. Click the Service category drop-down and choose the relevant category.
4. Click Save.
Reordering your services and categories
- To reorder services within a category:
1. Select a category from the drop-down at the top.
2. Click and hold the drag handle next to your services to drag and drop them into your preferred order.
- To reorder categories:
1. Click Manage Categories at the top of the list.
2. Click and hold the drag handle next to your categories to drag and drop them into your preferred order.
Renaming categories
1. Go to Booking Services in your site's dashboard.
2. Click Manage Categories.
3. Hover over the category you want to rename.
4. Click Edit Name.
5. Enter the new category name.
6. Click Save.
Deleting a category
1. Go to Booking Services in your site's dashboard.
2. Click Manage Categories.
3. Hover over the relevant category.
4. Click Delete.
5. Choose to move services to another category or delete the category and its services.`,
            },
            metadata: { query_intent: 'Procedural' },
          },
          {
            input: {
              question:
                'How long does it take for my products to appear in a Wix Google Ads campaign, and are there any prerequisites or approval steps I should complete first?',
            },
            output: {
              expected: `You should connect your Google Mechant account first and have your products approved there. In Google Merchant Solutions tab you can see an overview of the status of your products at the top of the page. All your products with the 'Live' status that are also set to 'Visible' in Google Merchant Solutions appear across Google's channels as part of your campaign. After you list your products on Google Merchant Solutions, it can take up to 72 hours for Google to approve them. Once you have the approved products, you can create your campaign, purchase a subscription and launch it. After that, you will be able to track your campaign's progress and metrics from the Google Ads with Wix dashboard.`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: { question: 'how to cancel both site plan and domain after already paying' },
            output: {
              expected: `To cancel both your site plan and domain, you need to do it separately by going to the Premium Subscriptions page, clicking the More Actions icon next to the relevant plan or domain, and selecting 'Cancel Plan' or 'Cancel domain.' Your plan and domain will remain active until the end of the subscription period.`,
            },
            metadata: { query_intent: 'Procedural' },
          },
          {
            input: {
              question:
                'can i temporarily unpublish my website and stop billing, then access it later',
            },
            output: {
              expected: `You can temporarily unpublish your website to make it inaccessible to the public, but unpublishing does not stop billing for your domain or Premium plan. Canceling your Premium plan will not delete your website, and you can restore the plan later by turning auto-renew back on or purchasing a new plan if the subscription has ended.`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question: 'can I extend my current plan and domain contract to be a month longer',
            },
            output: {
              expected: `you can't extend a Premium plan by just one month, but you can change your subscription period to a longer term. You can extend your domain registration by up to several additional years through your Wix account.`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question:
                'How can I set up an automation on Wix for a clients birthday to send an email offering a free class?',
            },
            output: {
              expected: `To do this, you first need to create a contacts segment that groups contacts by birthday.
To create a segment:
Go to contacts in your site's dashboard.
Click the Segments tab.
Click the + Create New drop-down and select Segment.
Add a name for your segment to help you identify it later
Select all the relevant filters that apply to this segment, or click + Add a Filter to create your first filter.
Note: Add the filters one at a time. The more filters you add, the more specific the segment becomes.
Create your filter by choosing an attribute, condition and value:
Note: The options change depending on what you select.
Choose an option from the Contact attribute or Contact activity list. Following the 'returning customer' example, we want to find all contacts who have previously spent money on the site. To find this we select 'total amount spent.'
Click the Choose a condition drop-down to choose logic for your filter. The logic sets the rules for your segment.
Click Create Segment. The new segment appears under Your segments.
Then, create an automation using the Segments trigger set to trigger when a contact enters your birthday segment.
To add a new automation:
Go to Automations in your site's dashboard.
Click + New Automation in the top right corner.
Click + Start from Scratch.
Click the app you'd like to base your trigger on in the Trigger section.
Select your chosen trigger from the available options.
Note: These options will differ depending on the app you selected in step 1.
Click the Limit frequency to drop-down to set trigger frequency:
Don't limit (trigger every time): Your action will take place every time it is triggered by a visitor.
Once per contact: Your action will take place only once per contact.
Once per contact every 24hrs: Your action will take place only once per contact in any 24hr period.
Click your chosen action in the Action section.
Note: The actions available will differ based on your trigger choice.
Set up the action using the available options.
Click Edit in the Sender details section to edit your sender details:
From name: This is the name that appears in the recipient's inbox.
Reply-to email: This is the address that replies are sent to.
Scroll down to the Create an email section and choose what you want to do:
Click Edit to update the default template generated by this automation.
Click the More Actions drop-down and select Switch template to use an email template from a different automation or email marketing campaign.
Click Activate to save and activate the automation. It now appears on your Automations page where you can edit, deactivate or delete according to your needs.`,
            },
            metadata: { query_intent: 'Procedural' },
          },
          {
            input: {
              question:
                'I want to transfer my domain domain purchased from Wix to another host? Is there a seperate procedure for .co.uk domains?',
            },
            output: {
              expected: `You can transfer a domain purchased from Wix to another domain host. When you transfer your domain away from Wix, your domain's contact information, DNS settings, and renewal payments are all managed in your new provider's account.
To transfer your domain:
1. Go to Domains in your Wix account.
2. Click the Domain Actions icon next to the relevant domain.
3. Select Transfer away from Wix.
4. After reviewing the info about transferring your domain, click Transfer Domain.
5. Click I Still Want to Transfer. We'll send a transfer authorization code (EPP code) to your domain's registrant contact email address.
6. Once you get the code, follow the instructions from your new domain host to transfer your domain.
For .co.uk domains, you need an IPS tag from your new provider. Enter the IPS tag in your Wix account to initiate the transfer. The process will be finalized within 7 days.`,
            },
            metadata: { query_intent: 'Procedural' },
          },
          {
            input: {
              question:
                'Im having trouble finding the arrows and the Change Slide Background option in a full-width slideshow on Wix.',
            },
            output: {
              expected: `To change the background of your slideshow:
1. Click the slideshow in the editor.
2. Click the arrows next to the slide number to navigate to the relevant slide.
3. Click Change Slide Background.
To display buttons or arrows on your slideshow:
1. Click your slideshow in the Editor.
2. Click the Layout icon and choose what you want to display:
3. Show navigation arrows: Enable the toggle to display the arrows.`,
            },
            metadata: { query_intent: 'Procedural' },
          },
          {
            input: {
              question:
                'I would like to know how to set up all available mobile POS solutions in the UK',
            },
            output: {
              expected: `For businesses in the UK looking for third-party POS solutions, Square and SumUp are both suitable options.
Please follow these steps to set up a POS with SumUp:
Step 1 | Download the Wix app
1. Go to the Apple App Store (on iPhone) or Google Play (on Android).
2. Type 'Wix' in the Search field.
3. Click Get or Install to download the app. You are now ready to accept cash payments on your mobile device
Step 2 | Set up SumUp as your payment provider Go to Accept Payments in your site's dashboard and connect SumUp as your payment provider. Note: You can set up SumUp without an upgrade, but to start collecting payments, you'll need a Premium plan or Studio plan that supports payments.
Step 3 | Order a SumUp card reader To accept credit card payments, you need one of SumUp's credit card readers. SumUp card readers connect to your smartphone or tablet via Bluetooth. They can be used to swipe, tap or insert debit/credit cards. The SumUp card reader Contact SumUp to order one of their card readers.
Please follow these steps to set up a POS with Square:
Step 1 | Download the Wix app Go to the Apple App Store (on an iOS device) or Google Play (on Android). Type 'Wix' in the Search field. Click Get or Install to download the app. You are now ready to accept cash payments on your mobile device.
Step 2 | Download the Square app To use Square for POS sales, you need to download the Square app to your mobile device.
To download to an iOS device:
1. Open the App Store on your iOS device.
2. Search for Square Point of Sale (POS).
3. Tap Get next to Square Point of Sale (POS).
4. Tap Install.
To download to an Android device:
1. Open the Play Store on your Android device.
2. Search for Square Point of Sale (POS).
3. Tap Square Point of Sale (POS).
4. Tap Install.
Step 3 | Set up Square as your payment provider Go to Accept Payments in your site's dashboard and set up Square as your payment provider. Note: You can set up Square without an upgrade, but to start collecting payments, you'll need aPremium plan or Studio plan that supports payments.
Step 4 | Order a magstripe card reader To swipe credit cards, you need a magstripe card reader which plugs into your smartphone or tablet's headphone jack. Magstripe card reader Contact Square to order your free magstripe reader.`,
            },
            metadata: { query_intent: 'Procedural' },
          },
          {
            input: {
              question:
                'How can I set up a flat rate shipping fee and charge the same rate for all purchases delivered to a certain region in Wix Stores.',
            },
            output: {
              expected: `To set up flat rate shipping and charge the same rate for all purchases delivered to a certain region, please follow these steps:
Step 1 | Create or Select a Shipping Region
A region can be made of one or more countries. Alternatively, it can be made of one or more regions within a country. You can set up different shipping regions for your store. For example, a merchant might set up 4 shipping rules: a local shipping region for California, a region for the rest of the US, another for Mexico and Canada, and finally one for the rest of the world.
Important:
If there is no rule for a region, customers from that region cannot make store purchases.
If you previously set up shipping (and tax) in a merchant account (e.g. in PayPal), remove these settings before starting.
1. Go to the Shipping & fulfillment settings in your site's dashboard.
2. Select an option:
- Edit a default rule: Click the region you want to set up.
- Create a new rule:
a. Click Add Region.
b. Click +Add destination, start typing a country name and select it.
3. Click Done or move directly on to the next step.
Step 2 | Set Up a Flat Rate Shipping Rule
1. Select Flat Rate from the Select how shipping is calculated drop-down.
2. Enter a name in the Shipping Option Name field (e.g. Standard Shipping).
3. Enter the shipping rate.
4. Click the Offer Free Shipping when customer buys over a certain amount checkbox and enter the amount.
Note: If you create additional shipping services (e.g. priority shipping), this checkbox must be selected and the amount specified to apply to each rule.
5. Click Add another Delivery Option to add an additional options (e.g. Express Shipping).
6. Click Save.
Step 3 | Offer Local Delivery or Pickup options
After saving your shipping rule, you can select the region again and add local delivery or pickup options.`,
            },
            metadata: { query_intent: 'Procedural' },
          },
          {
            input: {
              question:
                'Im having trouble applying a 50% off coupon in Wix Stores. Its not applying the discount, and I need assistance with this issue.',
            },
            output: {
              expected: `Check If the Coupon is Out-of-Date:
When creating a coupon, you can limit when it can be used. For example, a "June Sale" coupon might be active from June 1 to June 30. Customers trying to use it outside these dates will be unable to apply the coupon.
Edit the dates to extend the validity if necessary.
Check the Visibility of the Promo Code Link:
Ensure the "Enter a promo code" link is enabled.
Verify that the font color of the link contrasts with your site's background color so it is visible.
Ensure the Coupon is Activated:
If a coupon is deactivated, customers will not be able to use it.
Reactivate the coupon in your settings if needed.
Check If the Coupon Reached Its Usage Limit:
Coupons can be limited by total usage or to one use per person. For example, the first 50 people to use a discount.
If the coupon has exceeded its usage limits, it won't be applicable for more customers.
Verify the Coupon Code Format:
Customers may mistakenly add spaces to the coupon code (e.g., "March Madness" instead of "MarchMadness"), rendering it invalid.
Advise customers to copy and paste the coupon code carefully without any additional spaces.`,
            },
            metadata: { query_intent: 'Issue Resolution' },
          },
          {
            input: {
              question:
                'I would like to know how many sites I can have with Wix and what happens if I reach the limit for free sites on my account?',
            },
            output: {
              expected: `With Wix, you're not just limited to creating a single site. You can create as many as you need to manage multiple businesses, separate your personal site or blog, or experiment with different designs.
If you reach the limit of free sites you can have within your account, you can move old sites to trash or upgrade your sites to Premium.`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: { question: 'I would like to know how many options Wix offers per product.' },
            output: {
              expected: `You can have up to 6 product options, 100 option choices, and a total of 1000 variants.`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question:
                'I want to update the picture that appears when I share my website link with someone using my editor.',
            },
            output: {
              expected: `Go to your editor and publish your site.To update the picture that appears when you share your website link, you need to change the og:image settings in your Wix Editor. Here are the steps you can follow:
1. For an individual page:
- Go to your Wix Editor and click on 'Pages & Menu' on the left side.
- Hover over the relevant page and click the More Actions icon.
- Choose 'Social Share' and click 'Upload Image' to select a new image.
- Click 'Add to Page'.
- Publish your site.
2. For the whole site:
- Open your site's settings and click on 'Website settings'.
- Scroll down to 'General social image' and click 'Upload Image'.
- Select a new image or upload a new one, then click 'Choose File' and 'Save'.
- Go to your editor and publish your site.`,
            },
            metadata: { query_intent: 'Procedural' },
          },
          {
            input: {
              question:
                'I want to know more about the "Right Click Protect App" to prevent visitors from copying my website content.',
            },
            output: {
              expected: `The Right Click Protect app is a tool available from the Wix App Market designed to help prevent visitors from downloading images or copying text from your website by displaying a custom copyright message when they attempt to right-click. However, it does not prevent copying via Ctrl+C or using the print screen function.
To add the app, you can go to your Wix Editor, click on 'Add Apps', search for the Right Click Protect app, and add it to your site.
You can customize the message that appears when someone right-clicks on your content.`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question:
                'I want to delete other payment methods and keep Square as my only payment processor.',
            },
            output: {
              expected: `To disconnect a payment provider
Go to Accept Payments on your site's dashboard.
Click Manage beside the relevant payment provider.
Click Disconnect`,
            },
            metadata: { query_intent: 'Procedural' },
          },
          {
            input: {
              question:
                'If I cancel Premium in the first two weeks, how long does it take for the full refund to process?',
            },
            output: {
              expected: `If you cancel during the first 14 days, your plan ends immediately and you are fully refunded within the next 20 business days`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question:
                "I'm trying to understand more about Wix Shipping. Who is the partner company that Wix worked with on this?",
            },
            output: {
              expected: `Wix has partnered with Shippo to create Wix Shipping - an integrated print label solution`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question:
                'When I create a new Wix store, what are the standard shipping rules that are already in place? Can you list them for me?',
            },
            output: {
              expected: `New stores come with 2 shipping rules already set up - a free shipping rule for your region and a free international shipping rule for the rest of the world`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question:
                "Hi, I just set up my store and I see two default shipping regions, Domestic and International. I haven't changed any settings yet, what is the default shipping price for those?",
            },
            output: {
              expected: `By default, both the "Domestic" and "International" shipping regions are set to Free Shipping`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question: "Wix's website builder is available in how many different languages?",
            },
            output: { expected: `The Wix website builder is available in 17 languages` },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question:
                "I'm setting up my shop here in Canada. Which 'buy now, pay later' companies can I use?",
            },
            output: {
              expected: `The BNPL providers available for Canada are Afterpay, Klarna, Sezzle, and Splitit`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question:
                'I have a free Wix website right now. Can I still add one of these installment payment options to my checkout?',
            },
            output: {
              expected: `No. To accept any form of payment on your Wix site, including BNPL solutions, you must first upgrade to a Premium plan that allows you to accept payments.`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question: 'What are the standard processing fees for using Stripe on my Wix site?',
            },
            output: {
              expected: `The standard processing fee is 2.9% + $0.30 per transaction. However, fees can vary by country, so you should visit Stripe for the most accurate information.`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question:
                "I'm setting up my store and my Wix account currency is in Canadian Dollars, but my Stripe account is in US Dollars. Will that cause a problem?",
            },
            output: {
              expected: `Yes; the currency used in your Wix account must match the currency in your Stripe account, otherwise transactions may be declined.`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question:
                'How many countries are supported for Stripe payments on Wix? List each of them?',
            },
            output: {
              expected: `Wix supports Stripe in 41 countries. Austria, Australia, Belgium, Bulgaria, Canada, Croatia, Cyprus, Czech Republic, Denmark, Finland, France, Germany, Gibraltar, Hong Kong, Hungary, Ireland, Italy, Japan, Latvia, Liechtenstein, Lithuania, Luxembourg, Malaysia, Malta, Mexico, Netherlands, Norway, New Zealand, Poland, Portugal, Romania, Singapore, Slovenia, Slovakia, Spain, Sweden, Switzerland, Thailand, United Arab Emirates, United Kingdom and United States`,
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question:
                'I just issued a refund but entered the wrong amount. Can I cancel or reverse it?',
            },
            output: {
              expected: `No. Once a refund has been initiated, it cannot be canceled or reversed`,
            },
            metadata: { query_intent: 'Factual' },
          },
        ],
      },
    });
  });

  evaluate('analytical queries', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'agentBuilder: default-agent-analytical-queries',
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
        name: 'agentBuilder: default-agent-hybrid-queries',
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
        name: 'agentBuilder: default-agent-unanswerable-queries',
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
        name: 'agentBuilder: default-agent-ambiguous-queries',
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
});
