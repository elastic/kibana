Users with roles granting them access to monitoring (observability) and siem (security solution) should only be able to access alerts with those roles

```bash
myterminal~$ ./get_security_solution_alert.sh observer
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Unauthorized to get \"rac:8.0.0:securitySolution/get\" alert\""
}
myterminal~$ ./get_security_solution_alert.sh 
{
  "success": true
}
myterminal~$ ./get_observability_alert.sh 
{
  "success": true
}
myterminal~$ ./get_observability_alert.sh hunter
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Unauthorized to get \"rac:8.0.0:observability/get\" alert\""
}
```
