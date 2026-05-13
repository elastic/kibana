## ES|QL query examples

```esql
// What are the 10 latest errors from the logs?
FROM logs
| WHERE level == "ERROR"
| SORT @timestamp DESC
| LIMIT 10
```

```esql
// What are the titles and descriptions of the blog articles published last month?
FROM blogposts
| WHERE published > NOW() - 1 month
| KEEP title, description
| SORT title
| LIMIT 100
```

```esql
// How many employees are from the Netherlands?
FROM employees
| WHERE country == "NL"
| STATS COUNT(*)
```

```esql
// How many orders were placed each month over the last year?
FROM orders
| WHERE order_date > NOW() - 1 year
| STATS count = COUNT(*) BY date_bucket = BUCKET(order_date, 1 month)
```

```esql
// Extract the date, message and IP address from the logs using DISSECT
FROM postgres-logs*
| DISSECT message "%{date} - %{msg} - %{ip}"
| KEEP date, msg, ip
| EVAL date = DATE_PARSE("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", date)
| LIMIT 100
```

```esql
// Find contributors which first name starts with "b", sort them by number of commits and then returns their first and last names for the top 5
FROM commits
| WHERE TO_LOWER(first_name) LIKE "b*"
| STATS doc_count = COUNT(*) by first_name, last_name
| SORT doc_count DESC
| KEEP first_name, last_name
| LIMIT 5
```

```esql
// What is the average salary of employees hired in 1985 split in 20 buckets?
FROM employees
| WHERE hire_date >= "1985-01-01T00:00:00Z" AND hire_date < "1986-01-01T00:00:00Z"
| STATS avg_salary = AVG(salary) BY date_bucket = BUCKET(hire_date, 20, "1985-01-01T00:00:00Z", "1986-01-01T00:00:00Z")
| SORT bucket
```

```esql
// How many employees were hired in 1985 and what is their salary distribution?
FROM employees
| WHERE hire_date >= "1985-01-01T00:00:00Z" AND hire_date < "1986-01-01T00:00:00Z"
| STATS c = COUNT(1) BY b = BUCKET(salary, 5000.)
| SORT b
```

```esql
// Calculate the failure rate per host over the past 24 hours
FROM logs-*
| WHERE @timestamp <= NOW() - 24 hours
| EVAL is_5xx = CASE(http.response.status_code >= 500, 1, 0)
| STATS total_events = COUNT(*), total_failures = SUM(is_5xx) BY host.hostname, bucket = BUCKET(@timestamp, 1 hour)
| EVAL failure_rate_per_host = total_failures / total_events
| DROP total_events, total_failures
```

```esql
// What is the min, max and average value of the numbers in the bag?
FROM bag_of_numbers
| EVAL min = MV_MIN(numbers), max = MV_MAX(numbers), avg = MV_AVG(numbers)
| KEEP bad_id, min, max, avg
```

```esql
// What messages, that do not contain the word "error", are in the logs?
FROM logs
| WHERE message NOT LIKE "*error*"
| KEEP message
| LIMIT 100
```

```esql
// Find first 10 users with names starting with "A" or "B", sorted by name
FROM users
| KEEP name
| WHERE name LIKE "A*" OR name LIKE "B*"
| SORT name
| LIMIT 10
```

```esql
// Get user names and birth dates, sorted by birth date
FROM personal_info
| EVAL birth=DATE_PARSE("yyyy-MM-dd", birth_date)
| KEEP user_name, birth
| SORT birth
| LIMIT 100
```

```esql
// How many unique IP addresses are there from France, Germany and Spain?
FROM users
| WHERE country IN (France, Germany, Spain)
| STATS COUNT_DISTINCT(user_ip)
```

```esql
// How many warning logs are there from the US?
FROM logs
| WHERE message LIKE "*warning*" AND location RLIKE ".*us.*"
| STATS COUNT(*)
```

```esql
// Find products matching "wireless headphones", return their document ids and relevance scores, sorted by score
FROM products METADATA _id, _score
| WHERE MATCH(description, "wireless headphones")
| SORT _score DESC
| KEEP _id, name, description, _score
| LIMIT 100
```

```esql
// Detect change points in CPU usage over the past week
FROM metrics-*
| WHERE @timestamp > NOW() - 7 days
| STATS avg_cpu = AVG(system.cpu.total.norm.pct) BY BUCKET(@timestamp, 1 hour)
| CHANGE_POINT avg_cpu ON @timestamp
| WHERE type IS NOT NULL
| KEEP @timestamp, avg_cpu, type, pvalue
```

```esql
// Detect spikes and dips in daily sales revenue
FROM sales
| STATS daily_revenue = SUM(amount) BY date = BUCKET(order_date, 1 day)
| CHANGE_POINT daily_revenue ON date AS change_type, significance
| WHERE change_type IS NOT NULL
| KEEP date, daily_revenue, change_type, significance
| SORT date
```

